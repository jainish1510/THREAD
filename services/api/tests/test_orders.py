import pytest
from conftest import checkout, csrf, login_admin

from app.db import SessionLocal
from app.models import OrderStatus as S
from app.routers.webhooks import handle_event
from app.services.orders import TRANSITIONS, can_transition
from app.services.payments import simulate

SKU = "THR-TEE-001-BLK-M"


def paid_order(client):
    r = checkout(client, [{"sku": SKU, "quantity": 1}])
    number, token = r.json()["order"]["number"], r.json()["access_token"]
    client.post(f"/checkout/{number}/pay-test", json={"access_token": token, "card_number": "4242424242424242"})
    return number, token


@pytest.mark.parametrize(
    "a,b,ok",
    [
        (S.pending_payment, S.paid, True),
        (S.pending_payment, S.shipped, False),
        (S.paid, S.preparing, True),
        (S.shipped, S.cancelled, False),
        (S.delivered, S.refunded, True),
        (S.cancelled, S.paid, False),
    ],
)
def test_state_machine(a, b, ok):
    assert can_transition(a, b) is ok


def test_terminal_states_have_no_exits():
    assert TRANSITIONS[S.cancelled] == set() and TRANSITIONS[S.refunded] == set()


def test_full_fulfilment_timeline(client):
    number, token = paid_order(client)
    login_admin(client)
    for status in ["preparing", "shipped", "out_for_delivery", "delivered"]:
        r = client.post(f"/admin/orders/{number}/advance", json={"status": status}, headers=csrf(client))
        assert r.status_code == 200, r.text
    order = client.get(f"/orders/{number}?token={token}").json()
    assert [e["status"] for e in order["events"]] == [
        "pending_payment",
        "paid",
        "preparing",
        "shipped",
        "out_for_delivery",
        "delivered",
    ]
    assert order["events"][-1]["location"] == "Nashville"


def test_illegal_transition_is_409(client):
    number, _ = paid_order(client)
    login_admin(client)
    r = client.post(f"/admin/orders/{number}/advance", json={"status": "delivered"}, headers=csrf(client))
    assert r.status_code == 409


def test_refund_restocks(client):
    number, _ = paid_order(client)
    login_admin(client)
    before = client.get(f"/admin/inventory?q={SKU}").json()[0]["on_hand"]
    client.post(f"/admin/orders/{number}/advance", json={"status": "refunded"}, headers=csrf(client))
    after = client.get(f"/admin/inventory?q={SKU}").json()[0]["on_hand"]
    assert after == before + 1


def test_webhook_is_idempotent_and_checks_amount(client):
    r = checkout(client, [{"sku": SKU, "quantity": 1}])
    number, total = r.json()["order"]["number"], r.json()["order"]["total_cents"]
    obj = {"metadata": {"order_number": number}, "amount_received": total}
    with SessionLocal() as db:
        assert handle_event(db, "evt_1", "payment_intent.succeeded", obj) == "paid"
    with SessionLocal() as db:
        assert handle_event(db, "evt_1", "payment_intent.succeeded", obj) == "duplicate"

    r = checkout(client, [{"sku": SKU, "quantity": 1}])
    number = r.json()["order"]["number"]
    with SessionLocal() as db:
        bad = {"metadata": {"order_number": number}, "amount_received": 1}
        assert handle_event(db, "evt_2", "payment_intent.succeeded", bad) == "amount_mismatch"


def test_webhook_failure_releases_reservation(client):
    r = checkout(client, [{"sku": SKU, "quantity": 1}])
    number = r.json()["order"]["number"]
    with SessionLocal() as db:
        assert (
            handle_event(db, "evt_3", "payment_intent.payment_failed", {"metadata": {"order_number": number}})
            == "cancelled"
        )


def test_luhn_and_decline_simulation():
    assert simulate("4242 4242 4242 4242") is None
    assert simulate("4242 4242 4242 4241") == "Your card number is invalid."
    assert "insufficient" in simulate("4000000000009995")


def test_admin_overview_shape(client):
    paid_order(client)
    login_admin(client)
    data = client.get("/admin/overview?days=30").json()
    assert data["kpis"]["orders"] == 1
    assert data["kpis"]["revenue_cents"] == 4800 + 800
    assert 0 < data["kpis"]["inventory_health"] <= 1
    assert len(data["series"]) >= 30
