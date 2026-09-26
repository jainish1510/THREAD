from concurrent.futures import ThreadPoolExecutor

from conftest import ADDRESS, checkout, csrf, login_admin, register
from fastapi.testclient import TestClient
from sqlalchemy import select, update

from app.db import SessionLocal
from app.main import app
from app.models import Variant

SKU = "THR-TEE-001-BLK-M"


def set_stock(sku: str, on_hand: int):
    with SessionLocal() as db:
        db.execute(update(Variant).where(Variant.sku == sku).values(on_hand=on_hand, reserved=0))
        db.commit()


def available(client, slug="everyday-tee", sku=SKU):
    rows = client.get(f"/inventory/{slug}").json()
    return next(r["available"] for r in rows if r["sku"] == sku)


def test_quote_is_server_priced(client):
    r = client.post("/checkout/quote", json={"items": [{"sku": SKU, "quantity": 1}]})
    q = r.json()
    assert q["subtotal_cents"] == 4800
    assert q["shipping_cents"] == 800  # under the $100 free-shipping threshold
    r = client.post("/checkout/quote", json={"items": [{"sku": SKU, "quantity": 3}]})
    assert r.json()["shipping_cents"] == 0


def test_checkout_reserves_then_payment_commits(client):
    set_stock(SKU, 42)
    r = checkout(client, [{"sku": SKU, "quantity": 1}])
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["payment_mode"] == "test"
    assert body["order"]["status"] == "pending_payment"
    assert available(client) == 41  # 42 → 41 as soon as the order is placed

    number, token = body["order"]["number"], body["access_token"]
    r = client.post(f"/checkout/{number}/pay-test", json={"access_token": token, "card_number": "4242 4242 4242 4242"})
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "paid"
    assert available(client) == 41
    with SessionLocal() as db:
        v = db.scalar(select(Variant).where(Variant.sku == SKU))
        assert (v.on_hand, v.reserved) == (41, 0)


def test_declined_card_keeps_order_pending(client):
    r = checkout(client, [{"sku": SKU, "quantity": 1}])
    number, token = r.json()["order"]["number"], r.json()["access_token"]
    r = client.post(f"/checkout/{number}/pay-test", json={"access_token": token, "card_number": "4000 0000 0000 0002"})
    assert r.status_code == 402
    assert "declined" in r.json()["detail"]


def test_cannot_oversell(client):
    set_stock(SKU, 2)
    assert checkout(client, [{"sku": SKU, "quantity": 2}]).status_code == 201
    r = checkout(client, [{"sku": SKU, "quantity": 1}])
    assert r.status_code == 409
    assert "sold out" in r.json()["detail"]


def test_concurrent_checkouts_never_oversell(client):
    set_stock(SKU, 5)

    def attempt(_):
        with TestClient(app) as c:
            return checkout(c, [{"sku": SKU, "quantity": 1}]).status_code

    with ThreadPoolExecutor(max_workers=8) as pool:
        codes = list(pool.map(attempt, range(12)))
    assert codes.count(201) == 5
    assert codes.count(409) == 7
    assert available(client) == 0


def test_abandoned_checkout_releases_stock(client):
    set_stock(SKU, 3)
    r = checkout(client, [{"sku": SKU, "quantity": 2}])
    assert available(client) == 1
    number, token = r.json()["order"]["number"], r.json()["access_token"]
    assert client.post(f"/checkout/{number}/cancel?token={token}").json()["status"] == "cancelled"
    assert available(client) == 3


def test_order_requires_token_or_owner(client):
    r = checkout(client, [{"sku": SKU, "quantity": 1}])
    number, token = r.json()["order"]["number"], r.json()["access_token"]
    assert client.get(f"/orders/{number}").status_code == 404
    assert client.get(f"/orders/{number}?token=wrong").status_code == 404
    assert client.get(f"/orders/{number}?token={token}").status_code == 200


def test_signed_in_checkout_links_order_and_saves_address(client):
    register(client)
    r = client.post(
        "/checkout",
        json={
            "email": "ada@example.com",
            "items": [{"sku": SKU, "quantity": 1}],
            "shipping_address": ADDRESS,
            "save_address": True,
        },
        headers=csrf(client),
    )
    assert r.status_code == 201
    number, token = r.json()["order"]["number"], r.json()["access_token"]
    client.post(f"/checkout/{number}/pay-test", json={"access_token": token, "card_number": "4242424242424242"})
    assert [o["number"] for o in client.get("/me/orders").json()] == [number]
    assert client.get("/me/addresses").json()[0]["is_default"] is True
    garments = client.get("/me/garments").json()
    assert garments[0]["sku"] == SKU


def test_unknown_sku_rejected(client):
    r = checkout(client, [{"sku": "THR-NOPE", "quantity": 1}])
    assert r.status_code == 422


def test_admin_restock_publishes_and_validates(client):
    login_admin(client)
    r = client.patch(f"/admin/variants/{SKU}", json={"on_hand": 99}, headers=csrf(client))
    assert r.status_code == 200
    assert available(client) == 99
