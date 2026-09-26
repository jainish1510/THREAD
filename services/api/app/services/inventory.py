"""
Inventory consistency.

Every stock change is a single conditional UPDATE, so concurrent checkouts can
never oversell: the database only decrements when enough stock remains, and
CHECK constraints (reserved >= 0, on_hand >= reserved) back that up.
"""

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from ..events import broker
from ..models import Product, Variant


class OutOfStock(Exception):
    def __init__(self, sku: str, available: int):
        super().__init__(sku)
        self.sku = sku
        self.available = available


def reserve(db: Session, sku: str, quantity: int) -> None:
    result = db.execute(
        update(Variant)
        .where(Variant.sku == sku, Variant.on_hand - Variant.reserved >= quantity)
        .values(reserved=Variant.reserved + quantity)
    )
    if result.rowcount != 1:
        v = db.scalar(select(Variant).where(Variant.sku == sku))
        raise OutOfStock(sku, v.available if v else 0)


def release(db: Session, sku: str, quantity: int) -> None:
    db.execute(
        update(Variant)
        .where(Variant.sku == sku, Variant.reserved >= quantity)
        .values(reserved=Variant.reserved - quantity)
    )


def commit_sale(db: Session, sku: str, quantity: int) -> None:
    """Payment captured: the reserved units leave stock for good."""
    db.execute(
        update(Variant)
        .where(Variant.sku == sku, Variant.reserved >= quantity)
        .values(reserved=Variant.reserved - quantity, on_hand=Variant.on_hand - quantity)
    )


def restock(db: Session, sku: str, quantity: int) -> None:
    db.execute(update(Variant).where(Variant.sku == sku).values(on_hand=Variant.on_hand + quantity))


def publish_levels(db: Session, skus: list[str]) -> None:
    """Broadcast current availability for SKUs. Call after the transaction commits."""
    if not skus:
        return
    rows = db.execute(
        select(Variant.sku, Variant.on_hand, Variant.reserved, Product.slug)
        .join(Product, Product.id == Variant.product_id)
        .where(Variant.sku.in_(skus))
    ).all()
    for sku, on_hand, reserved, slug in rows:
        payload = {"sku": sku, "available": on_hand - reserved, "product": slug}
        broker.publish(f"inventory:{slug}", payload)
        broker.publish("inventory:*", payload)
