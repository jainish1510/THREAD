import hmac
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession
from sqlalchemy.orm import selectinload

from .. import models
from ..db import get_db
from ..deps import optional_user
from ..models import Order, OrderStatus
from ..ratelimit import limit
from ..schemas import CheckoutIn, CheckoutOut, OrderOut, QuoteIn, QuoteOut, TestPaymentIn
from ..services import orders, payments
from .catalog import SSE_HEADERS, _sse

router = APIRouter(tags=["checkout"])
log = logging.getLogger("thread.checkout")


@router.post("/checkout/quote", response_model=QuoteOut)
def checkout_quote(body: QuoteIn, db: DbSession = Depends(get_db)):
    """Server-authoritative prices and live availability for the bag."""
    return orders.quote(db, body.items, body.shipping_method)


@router.post("/checkout", response_model=CheckoutOut, status_code=201, dependencies=[Depends(limit("checkout", 20))])
def checkout(body: CheckoutIn, db: DbSession = Depends(get_db), user: models.User | None = Depends(optional_user)):
    mode = "stripe" if payments.enabled() else "test"
    address = body.shipping_address.model_dump()
    order = orders.create_order(
        db,
        email=body.email,
        items=body.items,
        address=address,
        method=body.shipping_method,
        user_id=user.id if user else None,
        payment_mode=mode,
    )
    if user and body.save_address:
        has_default = db.scalar(
            select(models.Address).where(models.Address.user_id == user.id, models.Address.is_default.is_(True))
        )
        db.add(models.Address(user_id=user.id, is_default=not has_default, **address))

    client_secret = None
    if mode == "stripe":  # pragma: no cover - network
        try:
            order.payment_intent_id, client_secret = payments.create_intent(order, body.email)
        except Exception as e:
            db.rollback()
            log.exception("stripe intent failed")
            raise HTTPException(status_code=502, detail="We couldn't start payment. Please try again.") from e
    db.commit()
    db.refresh(order)
    orders.announce(db, order)
    return CheckoutOut(
        order=OrderOut.model_validate(order),
        access_token=order.access_token,
        payment_mode=mode,
        client_secret=client_secret,
        reserved_until=order.reserved_until,
    )


def _get_order(db: DbSession, number: str) -> Order:
    order = db.scalar(
        select(Order).options(selectinload(Order.items), selectinload(Order.events)).where(Order.number == number)
    )
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found.")
    return order


def _authorize(order: Order, token: str | None, user: models.User | None) -> None:
    if user and (user.role == models.Role.admin or order.user_id == user.id):
        return
    if token and hmac.compare_digest(token, order.access_token):
        return
    raise HTTPException(status_code=404, detail="Order not found.")


@router.post("/checkout/{number}/pay-test", response_model=OrderOut, dependencies=[Depends(limit("pay", 20))])
def pay_test(number: str, body: TestPaymentIn, db: DbSession = Depends(get_db)):
    """Test-mode payment simulator (only when Stripe is not configured)."""
    if payments.enabled():
        raise HTTPException(status_code=400, detail="Test payments are disabled when Stripe is configured.")
    order = _get_order(db, number)
    _authorize(order, body.access_token, None)
    if order.status != OrderStatus.pending_payment:
        raise HTTPException(status_code=409, detail="This order has already been paid.")
    error = payments.simulate(body.card_number)
    if error:
        raise HTTPException(status_code=402, detail=error)
    orders.transition(db, order, OrderStatus.paid, note="Order confirmed — payment received")
    db.commit()
    orders.announce(db, order)
    return order


@router.post("/checkout/{number}/cancel", response_model=OrderOut)
def cancel_checkout(number: str, token: str, db: DbSession = Depends(get_db)):
    """Abandon an unpaid checkout and release its reserved stock immediately."""
    order = _get_order(db, number)
    _authorize(order, token, None)
    if order.status != OrderStatus.pending_payment:
        raise HTTPException(status_code=409, detail="Only unpaid orders can be cancelled here.")
    if order.payment_intent_id:  # pragma: no cover - network
        payments.cancel_intent(order.payment_intent_id)
    orders.transition(db, order, OrderStatus.cancelled, note="Checkout abandoned")
    db.commit()
    orders.announce(db, order)
    return order


@router.get("/orders/{number}", response_model=OrderOut)
def get_order(
    number: str,
    token: str | None = None,
    db: DbSession = Depends(get_db),
    user: models.User | None = Depends(optional_user),
):
    order = _get_order(db, number)
    _authorize(order, token, user)
    return order


@router.get("/orders/{number}/stream")
async def order_stream(
    number: str,
    request: Request,
    token: str | None = None,
    db: DbSession = Depends(get_db),
    user: models.User | None = Depends(optional_user),
):
    order = _get_order(db, number)
    _authorize(order, token, user)
    db.close()
    return StreamingResponse(
        _sse(request, f"order:{number}", "order"), media_type="text/event-stream", headers=SSE_HEADERS
    )
