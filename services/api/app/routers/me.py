from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DbSession
from sqlalchemy.orm import selectinload

from .. import models
from ..db import get_db
from ..deps import require_user
from ..models import Order, OrderStatus
from ..schemas import AddressIn, AddressOut, MeasurementsIO, OrderOut, PreferencesIO, WishlistOut

router = APIRouter(prefix="/me", tags=["account"])


@router.get("/orders", response_model=list[OrderOut])
def my_orders(user: models.User = Depends(require_user), db: DbSession = Depends(get_db)):
    return db.scalars(
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.events))
        .where(Order.user_id == user.id, Order.status != OrderStatus.pending_payment)
        .order_by(Order.created_at.desc())
    ).all()


@router.get("/garments")
def my_garments(user: models.User = Depends(require_user), db: DbSession = Depends(get_db)):
    """Every garment the customer owns — one digital passport per unit purchased."""
    rows = db.execute(
        select(models.OrderItem, Order.number, Order.created_at)
        .join(Order, Order.id == models.OrderItem.order_id)
        .where(
            Order.user_id == user.id,
            Order.status.in_(
                [
                    OrderStatus.paid,
                    OrderStatus.preparing,
                    OrderStatus.shipped,
                    OrderStatus.out_for_delivery,
                    OrderStatus.delivered,
                ]
            ),
        )
        .order_by(Order.created_at.desc())
    ).all()
    out = []
    for item, number, created in rows:
        for unit in range(item.quantity):
            out.append(
                {
                    "sku": item.sku,
                    "product_slug": item.product_slug,
                    "product_name": item.product_name,
                    "color": item.color,
                    "size": item.size,
                    "batch": item.batch,
                    "order_number": number,
                    "purchased_at": created,
                    "unit": unit + 1,
                }
            )
    return out


# ---- Addresses ----
@router.get("/addresses", response_model=list[AddressOut])
def list_addresses(user: models.User = Depends(require_user), db: DbSession = Depends(get_db)):
    return db.scalars(
        select(models.Address)
        .where(models.Address.user_id == user.id)
        .order_by(models.Address.is_default.desc(), models.Address.id)
    ).all()


@router.post("/addresses", response_model=AddressOut, status_code=201)
def add_address(body: AddressIn, user: models.User = Depends(require_user), db: DbSession = Depends(get_db)):
    first = not db.scalar(select(models.Address.id).where(models.Address.user_id == user.id))
    addr = models.Address(user_id=user.id, is_default=first, **body.model_dump())
    db.add(addr)
    db.commit()
    return addr


def _own_address(db: DbSession, user: models.User, address_id: int) -> models.Address:
    addr = db.get(models.Address, address_id)
    if addr is None or addr.user_id != user.id:
        raise HTTPException(status_code=404, detail="Address not found.")
    return addr


@router.post("/addresses/{address_id}/default", response_model=AddressOut)
def make_default(address_id: int, user: models.User = Depends(require_user), db: DbSession = Depends(get_db)):
    addr = _own_address(db, user, address_id)
    for a in db.scalars(select(models.Address).where(models.Address.user_id == user.id)):
        a.is_default = a.id == addr.id
    db.commit()
    return addr


@router.delete("/addresses/{address_id}", status_code=204)
def delete_address(address_id: int, user: models.User = Depends(require_user), db: DbSession = Depends(get_db)):
    addr = _own_address(db, user, address_id)
    was_default = addr.is_default
    db.delete(addr)
    db.flush()
    if was_default:
        nxt = db.scalar(select(models.Address).where(models.Address.user_id == user.id))
        if nxt:
            nxt.is_default = True
    db.commit()


# ---- Wishlist ----
@router.get("/wishlist", response_model=list[WishlistOut])
def wishlist(user: models.User = Depends(require_user), db: DbSession = Depends(get_db)):
    return db.scalars(
        select(models.WishlistItem)
        .where(models.WishlistItem.user_id == user.id)
        .order_by(models.WishlistItem.created_at.desc())
    ).all()


@router.put("/wishlist/{slug}", status_code=204)
def save(slug: str, user: models.User = Depends(require_user), db: DbSession = Depends(get_db)):
    if not db.scalar(select(models.Product.id).where(models.Product.slug == slug)):
        raise HTTPException(status_code=404, detail="Product not found.")
    db.add(models.WishlistItem(user_id=user.id, product_slug=slug))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()  # already saved — idempotent


@router.delete("/wishlist/{slug}", status_code=204)
def unsave(slug: str, user: models.User = Depends(require_user), db: DbSession = Depends(get_db)):
    db.execute(
        delete(models.WishlistItem).where(
            models.WishlistItem.user_id == user.id, models.WishlistItem.product_slug == slug
        )
    )
    db.commit()


# ---- Measurements & preferences ----
@router.get("/measurements", response_model=MeasurementsIO)
def get_measurements(user: models.User = Depends(require_user), db: DbSession = Depends(get_db)):
    return db.get(models.Measurement, user.id) or MeasurementsIO()


@router.put("/measurements", response_model=MeasurementsIO)
def put_measurements(body: MeasurementsIO, user: models.User = Depends(require_user), db: DbSession = Depends(get_db)):
    m = db.get(models.Measurement, user.id) or models.Measurement(user_id=user.id)
    for k, v in body.model_dump().items():
        setattr(m, k, v)
    db.add(m)
    db.commit()
    return m


@router.get("/preferences", response_model=PreferencesIO)
def get_preferences(user: models.User = Depends(require_user), db: DbSession = Depends(get_db)):
    return db.get(models.Preferences, user.id) or PreferencesIO()


@router.put("/preferences", response_model=PreferencesIO)
def put_preferences(body: PreferencesIO, user: models.User = Depends(require_user), db: DbSession = Depends(get_db)):
    p = db.get(models.Preferences, user.id) or models.Preferences(user_id=user.id)
    for k, v in body.model_dump().items():
        setattr(p, k, v)
    db.add(p)
    db.commit()
    return p
