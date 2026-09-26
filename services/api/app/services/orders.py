"""Order creation, pricing and the order state machine."""

import secrets
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from ..config import get_settings
from ..events import broker
from ..models import Order, OrderEvent, OrderItem, OrderStatus, Variant
from ..observability import ORDERS, RESERVATION_FAILURES, REVENUE
from ..schemas import CheckoutItem
from . import inventory

S = OrderStatus

# The only legal transitions. Anything else is rejected.
TRANSITIONS: dict[OrderStatus, set[OrderStatus]] = {
    S.pending_payment: {S.paid, S.cancelled},
    S.paid: {S.preparing, S.cancelled, S.refunded},
    S.preparing: {S.shipped, S.cancelled},
    S.shipped: {S.out_for_delivery},
    S.out_for_delivery: {S.delivered},
    S.delivered: {S.refunded},
    S.cancelled: set(),
    S.refunded: set(),
}

DEFAULT_NOTES: dict[OrderStatus, str] = {
    S.pending_payment: "Awaiting payment",
    S.paid: "Order confirmed",
    S.preparing: "Being prepared",
    S.shipped: "Shipped",
    S.out_for_delivery: "Out for delivery",
    S.delivered: "Delivered",
    S.cancelled: "Cancelled",
    S.refunded: "Refunded",
}

# Where the parcel is at each step (demo logistics network).
DEFAULT_LOCATIONS: dict[OrderStatus, str] = {
    S.paid: "Nashville",
    S.preparing: "Nashville",
    S.shipped: "Nashville",
}


class InvalidTransition(HTTPException):
    def __init__(self, current: OrderStatus, target: OrderStatus):
        super().__init__(
            status_code=409,
            detail=f"An order that is {current.value.replace('_', ' ')} cannot become {target.value.replace('_', ' ')}.",
        )


def can_transition(current: OrderStatus, target: OrderStatus) -> bool:
    return target in TRANSITIONS[current]


def shipping_for(subtotal_cents: int, method: str) -> int:
    s = get_settings()
    if method == "express":
        return s.express_shipping_cents
    return 0 if subtotal_cents >= s.free_shipping_threshold_cents else s.flat_shipping_cents


def _merge(items: list[CheckoutItem]) -> dict[str, int]:
    merged: dict[str, int] = {}
    for it in items:
        merged[it.sku] = merged.get(it.sku, 0) + it.quantity
    return merged


def load_variants(db: Session, skus: list[str]) -> dict[str, Variant]:
    rows = db.scalars(select(Variant).options(selectinload(Variant.product)).where(Variant.sku.in_(skus))).all()
    found = {v.sku: v for v in rows}
    missing = [s for s in skus if s not in found or not found[s].product.active]
    if missing:
        raise HTTPException(status_code=422, detail=f"Some items are no longer available: {', '.join(missing)}")
    return found


def quote(db: Session, items: list[CheckoutItem], method: str) -> dict:
    merged = _merge(items)
    variants = load_variants(db, list(merged))
    lines = [
        {
            "sku": sku,
            "quantity": q,
            "unit_price_cents": variants[sku].product.price_cents,
            "available": variants[sku].available,
        }
        for sku, q in merged.items()
    ]
    subtotal = sum(line["unit_price_cents"] * line["quantity"] for line in lines)
    shipping = shipping_for(subtotal, method)
    tax = round(subtotal * get_settings().tax_rate)
    return {
        "lines": lines,
        "subtotal_cents": subtotal,
        "shipping_cents": shipping,
        "tax_cents": tax,
        "total_cents": subtotal + shipping + tax,
    }


def _new_number(db: Session) -> str:
    for _ in range(10):
        n = f"THR-{secrets.randbelow(90000) + 10000}"
        if not db.scalar(select(func.count()).select_from(Order).where(Order.number == n)):
            return n
    raise RuntimeError("could not allocate order number")


def create_order(
    db: Session,
    *,
    email: str,
    items: list[CheckoutItem],
    address: dict,
    method: str,
    user_id: int | None,
    payment_mode: str,
) -> Order:
    """Prices server-side and reserves stock atomically. Caller commits."""
    merged = _merge(items)
    variants = load_variants(db, list(merged))
    # Deterministic lock order avoids deadlocks between concurrent checkouts on Postgres.
    for sku in sorted(merged):
        try:
            inventory.reserve(db, sku, merged[sku])
        except inventory.OutOfStock as e:
            RESERVATION_FAILURES.inc()
            v = variants[e.sku]
            left = "is sold out" if e.available <= 0 else f"has only {e.available} left"
            raise HTTPException(
                status_code=409,
                detail=f"{v.product.name} in {v.color} / {v.size} {left}.",
            ) from e

    subtotal = sum(variants[s].product.price_cents * q for s, q in merged.items())
    shipping = shipping_for(subtotal, method)
    tax = round(subtotal * get_settings().tax_rate)
    order = Order(
        number=_new_number(db),
        user_id=user_id,
        email=email.lower(),
        status=S.pending_payment,
        subtotal_cents=subtotal,
        shipping_cents=shipping,
        tax_cents=tax,
        total_cents=subtotal + shipping + tax,
        shipping_method=method,
        shipping_address=address,
        payment_mode=payment_mode,
        access_token=secrets.token_urlsafe(24),
        reserved_until=datetime.now(UTC) + timedelta(minutes=get_settings().reservation_minutes),
    )
    for sku, q in merged.items():
        v = variants[sku]
        order.items.append(
            OrderItem(
                variant_id=v.id,
                sku=sku,
                product_slug=v.product.slug,
                product_name=v.product.name,
                color=v.color,
                size=v.size,
                unit_price_cents=v.product.price_cents,
                quantity=q,
                batch=v.product.batch,
            )
        )
    order.events.append(OrderEvent(status=S.pending_payment, note=DEFAULT_NOTES[S.pending_payment]))
    db.add(order)
    db.flush()
    ORDERS.labels("created").inc()
    return order


def transition(
    db: Session, order: Order, target: OrderStatus, *, note: str | None = None, location: str | None = None
) -> Order:
    """Apply a state change with its inventory side effects. Caller commits, then calls `announce`."""
    if not can_transition(order.status, target):
        raise InvalidTransition(order.status, target)
    previous = order.status

    if target == S.paid:
        for it in order.items:
            inventory.commit_sale(db, it.sku, it.quantity)
        order.reserved_until = None
        REVENUE.inc(order.total_cents)
    elif target == S.cancelled:
        for it in order.items:
            if previous == S.pending_payment:
                inventory.release(db, it.sku, it.quantity)
            else:
                inventory.restock(db, it.sku, it.quantity)
        order.reserved_until = None
    elif target == S.refunded:
        # Returned goods go back into sellable stock after inspection.
        for it in order.items:
            inventory.restock(db, it.sku, it.quantity)

    order.status = target
    order.events.append(
        OrderEvent(
            status=target, note=note or DEFAULT_NOTES[target], location=location or DEFAULT_LOCATIONS.get(target)
        )
    )
    ORDERS.labels(target.value).inc()
    return order


def announce(db: Session, order: Order) -> None:
    """Post-commit: push the order and any stock changes to live subscribers."""
    last = order.events[-1]
    broker.publish(
        f"order:{order.number}",
        {
            "status": order.status.value,
            "note": last.note,
            "location": last.location,
            "created_at": last.created_at.isoformat(),
        },
    )
    broker.publish("orders:*", {"number": order.number, "status": order.status.value, "total_cents": order.total_cents})
    inventory.publish_levels(db, [it.sku for it in order.items])


def expire_stale_reservations(db: Session) -> int:
    """Release stock held by checkouts that were never paid."""
    now = datetime.now(UTC)
    stale = db.scalars(
        select(Order).where(
            Order.status == S.pending_payment, Order.reserved_until.is_not(None), Order.reserved_until < now
        )
    ).all()
    for order in stale:
        transition(db, order, S.cancelled, note="Payment not completed — reservation released")
    db.commit()
    for order in stale:
        announce(db, order)
    return len(stale)
