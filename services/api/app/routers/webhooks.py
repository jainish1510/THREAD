import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from ..config import get_settings
from ..db import get_db
from ..models import Order, OrderStatus, WebhookEvent
from ..services import orders, payments

router = APIRouter(tags=["webhooks"])
log = logging.getLogger("thread.webhooks")


def handle_event(db: DbSession, event_id: str, event_type: str, obj: dict) -> str:
    """Idempotent: each provider event is processed at most once."""
    if db.get(WebhookEvent, event_id):
        return "duplicate"
    db.add(WebhookEvent(id=event_id, type=event_type))
    number = (obj.get("metadata") or {}).get("order_number")
    order = db.scalar(select(Order).where(Order.number == number)) if number else None
    result = "ignored"
    if order is not None:
        if event_type == "payment_intent.succeeded" and order.status == OrderStatus.pending_payment:
            if obj.get("amount_received", obj.get("amount")) != order.total_cents:
                log.error("amount mismatch for %s", number)
                result = "amount_mismatch"
            else:
                orders.transition(db, order, OrderStatus.paid, note="Order confirmed — payment received")
                result = "paid"
        elif (
            event_type in ("payment_intent.payment_failed", "payment_intent.canceled")
            and order.status == OrderStatus.pending_payment
        ):
            orders.transition(db, order, OrderStatus.cancelled, note="Payment failed — reservation released")
            result = "cancelled"
        elif event_type == "charge.refunded" and orders.can_transition(order.status, OrderStatus.refunded):
            orders.transition(db, order, OrderStatus.refunded)
            result = "refunded"
    db.commit()
    if order is not None and result in ("paid", "cancelled", "refunded"):
        orders.announce(db, order)
    return result


@router.post("/webhooks/stripe")
async def stripe_webhook(request: Request, db: DbSession = Depends(get_db)):
    if not get_settings().stripe_webhook_secret:
        raise HTTPException(status_code=404, detail="Stripe webhooks are not configured.")
    payload = await request.body()
    signature = request.headers.get("stripe-signature", "")
    try:
        event = payments.construct_event(payload, signature)
    except Exception as e:
        log.warning("rejected webhook with invalid signature")
        raise HTTPException(status_code=400, detail="Invalid signature.") from e
    result = handle_event(db, event["id"], event["type"], event["data"]["object"])
    return {"received": True, "result": result}
