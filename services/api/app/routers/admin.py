from datetime import UTC, date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import Session as DbSession
from sqlalchemy.orm import selectinload

from .. import models
from ..db import get_db
from ..deps import require_admin
from ..models import Order, OrderItem, OrderStatus, Product, Variant
from ..schemas import AdvanceIn, OrderOut, VariantStockIn
from ..services import inventory, orders
from .catalog import SSE_HEADERS, _sse

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])

S = OrderStatus
SALE_STATUSES = [S.paid, S.preparing, S.shipped, S.out_for_delivery, S.delivered]
COMPLETED_STATUSES = [S.delivered, S.refunded]


def _window(days: int) -> tuple[datetime, datetime, datetime]:
    """Whole-day windows ending with today, so no bucket is a partial day at the start."""
    end = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
    start = end - timedelta(days=days)
    prev = start - timedelta(days=days)
    return prev, start, end


def _sales(db: DbSession, start: datetime, end: datetime) -> tuple[int, int]:
    revenue, count = db.execute(
        select(func.coalesce(func.sum(Order.total_cents), 0), func.count(Order.id)).where(
            Order.status.in_(SALE_STATUSES), Order.created_at >= start, Order.created_at < end
        )
    ).one()
    return int(revenue), int(count)


def _sessions(db: DbSession, start: datetime, end: datetime) -> int:
    return int(
        db.scalar(
            select(func.coalesce(func.sum(models.DailyTraffic.sessions), 0)).where(
                models.DailyTraffic.day >= start.date(), models.DailyTraffic.day < end.date()
            )
        )
    )


def _returns_rate(db: DbSession, start: datetime, end: datetime) -> float:
    refunded, completed = db.execute(
        select(
            func.coalesce(func.sum(case((Order.status == S.refunded, 1), else_=0)), 0),
            func.count(Order.id),
        ).where(Order.status.in_(COMPLETED_STATUSES), Order.created_at >= start, Order.created_at < end)
    ).one()
    return (refunded / completed) if completed else 0.0


def _delta(cur: float, prev: float) -> float | None:
    return None if not prev else (cur - prev) / prev


@router.get("/overview")
def overview(days: int = Query(30, ge=7, le=365), db: DbSession = Depends(get_db)):
    prev, start, end = _window(days)
    revenue, count = _sales(db, start, end)
    p_revenue, p_count = _sales(db, prev, start)
    sessions, p_sessions = _sessions(db, start, end), _sessions(db, prev, start)
    conversion = count / sessions if sessions else 0.0
    p_conversion = p_count / p_sessions if p_sessions else 0.0
    returns, p_returns = _returns_rate(db, start, end), _returns_rate(db, prev, start)

    total_variants, in_stock, units = db.execute(
        select(
            func.count(Variant.id),
            func.sum(case((Variant.on_hand - Variant.reserved > 0, 1), else_=0)),
            func.sum(Variant.on_hand - Variant.reserved),
        )
    ).one()
    inventory_health = (in_stock or 0) / total_variants if total_variants else 0.0

    day = func.date(Order.created_at)
    series_rows = db.execute(
        select(day, func.sum(Order.total_cents), func.count(Order.id))
        .where(Order.status.in_(SALE_STATUSES), Order.created_at >= start)
        .group_by(day)
        .order_by(day)
    ).all()
    by_day = {str(d): (int(r), int(c)) for d, r, c in series_rows}
    traffic = {
        str(t.day): t.sessions
        for t in db.scalars(select(models.DailyTraffic).where(models.DailyTraffic.day >= start.date()))
    }
    series = []
    for i in range(days):
        d = (start + timedelta(days=i)).date()
        r, c = by_day.get(str(d), (0, 0))
        series.append({"date": d.isoformat(), "revenue_cents": r, "orders": c, "sessions": traffic.get(str(d), 0)})

    top = db.execute(
        select(
            OrderItem.product_slug,
            OrderItem.product_name,
            func.sum(OrderItem.quantity),
            func.sum(OrderItem.quantity * OrderItem.unit_price_cents),
        )
        .join(Order, Order.id == OrderItem.order_id)
        .where(Order.status.in_(SALE_STATUSES), Order.created_at >= start)
        .group_by(OrderItem.product_slug, OrderItem.product_name)
        .order_by(func.sum(OrderItem.quantity * OrderItem.unit_price_cents).desc())
        .limit(8)
    ).all()
    categories = db.execute(
        select(Product.category, func.sum(OrderItem.quantity * OrderItem.unit_price_cents))
        .join(OrderItem, OrderItem.product_slug == Product.slug)
        .join(Order, Order.id == OrderItem.order_id)
        .where(Order.status.in_(SALE_STATUSES), Order.created_at >= start)
        .group_by(Product.category)
        .order_by(func.sum(OrderItem.quantity * OrderItem.unit_price_cents).desc())
    ).all()
    status_counts = dict(db.execute(select(Order.status, func.count(Order.id)).group_by(Order.status)).all())

    return {
        "days": days,
        "kpis": {
            "revenue_cents": revenue,
            "revenue_delta": _delta(revenue, p_revenue),
            "orders": count,
            "orders_delta": _delta(count, p_count),
            "conversion": conversion,
            "conversion_delta": _delta(conversion, p_conversion),
            "inventory_health": inventory_health,
            "units_available": int(units or 0),
            "returns_rate": returns,
            "returns_delta": _delta(returns, p_returns),
            "aov_cents": revenue // count if count else 0,
        },
        "series": series,
        "top_products": [{"slug": s, "name": n, "units": int(u), "revenue_cents": int(r)} for s, n, u, r in top],
        "categories": [{"category": c, "revenue_cents": int(r)} for c, r in categories],
        "pipeline": {k.value: status_counts.get(k, 0) for k in OrderStatus},
    }


@router.get("/orders")
def list_orders(
    status: OrderStatus | None = None,
    q: str | None = Query(None, max_length=80),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    include_simulated: bool = True,
    db: DbSession = Depends(get_db),
):
    stmt = select(Order).options(selectinload(Order.items))
    if status:
        stmt = stmt.where(Order.status == status)
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(or_(func.lower(Order.number).like(like), func.lower(Order.email).like(like)))
    if not include_simulated:
        stmt = stmt.where(Order.is_simulated.is_(False))
    total = db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery()))
    rows = db.scalars(stmt.order_by(Order.created_at.desc()).limit(limit).offset(offset)).all()
    return {
        "total": total,
        "orders": [
            {
                "number": o.number,
                "email": o.email,
                "status": o.status.value,
                "total_cents": o.total_cents,
                "items": sum(i.quantity for i in o.items),
                "created_at": o.created_at,
                "is_simulated": o.is_simulated,
                "next": sorted(s.value for s in orders.TRANSITIONS[o.status]),
            }
            for o in rows
        ],
    }


@router.get("/orders/{number}", response_model=OrderOut)
def get_order(number: str, db: DbSession = Depends(get_db)):
    order = db.scalar(
        select(Order).options(selectinload(Order.items), selectinload(Order.events)).where(Order.number == number)
    )
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found.")
    return order


LOGISTICS = {S.shipped: "Nashville", S.out_for_delivery: None, S.delivered: None}


@router.post("/orders/{number}/advance", response_model=OrderOut)
def advance(number: str, body: AdvanceIn, db: DbSession = Depends(get_db)):
    order = db.scalar(
        select(Order).options(selectinload(Order.items), selectinload(Order.events)).where(Order.number == number)
    )
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found.")
    location = order.shipping_address.get("city") if body.status in (S.out_for_delivery, S.delivered) else None
    orders.transition(db, order, body.status, note=body.note, location=location)
    db.commit()
    orders.announce(db, order)
    return order


@router.get("/inventory")
def inventory_levels(q: str | None = Query(None, max_length=80), low: bool = False, db: DbSession = Depends(get_db)):
    stmt = select(Variant, Product).join(Product, Product.id == Variant.product_id)
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(or_(func.lower(Variant.sku).like(like), func.lower(Product.name).like(like)))
    if low:
        stmt = stmt.where(Variant.on_hand - Variant.reserved < 5)
    rows = db.execute(stmt.order_by(Product.id, Variant.id)).all()
    return [
        {
            "sku": v.sku,
            "product": p.name,
            "slug": p.slug,
            "color": v.color,
            "size": v.size,
            "on_hand": v.on_hand,
            "reserved": v.reserved,
            "available": v.available,
        }
        for v, p in rows
    ]


@router.patch("/variants/{sku}")
def set_stock(sku: str, body: VariantStockIn, db: DbSession = Depends(get_db)):
    v = db.scalar(select(Variant).where(Variant.sku == sku))
    if v is None:
        raise HTTPException(status_code=404, detail="SKU not found.")
    if body.on_hand < v.reserved:
        raise HTTPException(
            status_code=409, detail=f"{v.reserved} units are reserved by open checkouts; on-hand cannot go below that."
        )
    v.on_hand = body.on_hand
    db.commit()
    inventory.publish_levels(db, [sku])
    return {"sku": sku, "on_hand": v.on_hand, "reserved": v.reserved, "available": v.available}


@router.get("/products")
def admin_products(db: DbSession = Depends(get_db)):
    sold = dict(
        db.execute(
            select(OrderItem.product_slug, func.sum(OrderItem.quantity))
            .join(Order, Order.id == OrderItem.order_id)
            .where(Order.status.in_(SALE_STATUSES))
            .group_by(OrderItem.product_slug)
        ).all()
    )
    out = []
    for p in db.scalars(select(Product).options(selectinload(Product.variants)).order_by(Product.id)):
        out.append(
            {
                "slug": p.slug,
                "name": p.name,
                "category": p.category,
                "price_cents": p.price_cents,
                "factory": p.factory_slug,
                "batch": p.batch,
                "active": p.active,
                "available": sum(v.available for v in p.variants),
                "variants": len(p.variants),
                "sold_out_variants": sum(1 for v in p.variants if v.available <= 0),
                "units_sold": int(sold.get(p.slug, 0)),
            }
        )
    return out


@router.get("/customers")
def customers(limit: int = Query(50, ge=1, le=200), db: DbSession = Depends(get_db)):
    rows = db.execute(
        select(
            models.User,
            func.count(Order.id),
            func.coalesce(func.sum(case((Order.status.in_(SALE_STATUSES), Order.total_cents), else_=0)), 0),
            func.max(Order.created_at),
        )
        .outerjoin(Order, Order.user_id == models.User.id)
        .group_by(models.User.id)
        .order_by(func.coalesce(func.sum(Order.total_cents), 0).desc())
        .limit(limit)
    ).all()
    return [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role.value,
            "orders": int(n),
            "lifetime_cents": int(ltv),
            "last_order": last,
            "joined": u.created_at,
        }
        for u, n, ltv, last in rows
    ]


@router.get("/factories")
def factories(db: DbSession = Depends(get_db)):
    units = dict(
        db.execute(
            select(Product.factory_slug, func.sum(OrderItem.quantity))
            .join(OrderItem, OrderItem.product_slug == Product.slug)
            .join(Order, Order.id == OrderItem.order_id)
            .where(Order.status.in_(SALE_STATUSES))
            .group_by(Product.factory_slug)
        ).all()
    )
    products = dict(
        db.execute(select(Product.factory_slug, func.count(Product.id)).group_by(Product.factory_slug)).all()
    )
    today = date.today()
    return [
        {
            "slug": f.slug,
            "name": f.name,
            "city": f.city,
            "country": f.country,
            "workers": f.workers,
            "last_audit": f.last_audit,
            "audit_score": f.audit_score,
            "audit_age_days": (today - f.last_audit).days,
            "certifications": f.certifications,
            "products": int(products.get(f.slug, 0)),
            "units_sold": int(units.get(f.slug, 0)),
        }
        for f in db.scalars(select(models.Factory).order_by(models.Factory.name))
    ]


@router.get("/materials")
def materials(db: DbSession = Depends(get_db)):
    used = dict(db.execute(select(Product.material_slug, func.count(Product.id)).group_by(Product.material_slug)).all())
    return [
        {
            "slug": m.slug,
            "name": m.name,
            "origin": m.origin,
            "certification": m.certification,
            "products": int(used.get(m.slug, 0)),
        }
        for m in db.scalars(select(models.Material).order_by(models.Material.name))
    ]


@router.get("/batches")
def batches(db: DbSession = Depends(get_db)):
    return [
        {
            "code": b.code,
            "product": b.product.name,
            "factory": b.factory_slug,
            "units": b.units,
            "manufactured": b.manufactured,
            "qc_pass_rate": b.qc_pass_rate,
            "status": b.status,
        }
        for b in db.scalars(
            select(models.Batch).options(selectinload(models.Batch.product)).order_by(models.Batch.manufactured.desc())
        )
    ]


@router.get("/shipping")
def shipping(db: DbSession = Depends(get_db)):
    """Orders in the fulfilment pipeline, oldest first."""
    rows = db.scalars(
        select(Order)
        .where(Order.status.in_([S.paid, S.preparing, S.shipped, S.out_for_delivery]))
        .order_by(Order.created_at)
        .limit(100)
    ).all()
    now = datetime.now(UTC)
    return [
        {
            "number": o.number,
            "status": o.status.value,
            "method": o.shipping_method,
            "destination": f"{o.shipping_address.get('city')}, {o.shipping_address.get('region')}",
            "age_hours": round(
                (now - (o.created_at if o.created_at.tzinfo else o.created_at.replace(tzinfo=UTC))).total_seconds()
                / 3600,
                1,
            ),
            "next": sorted(s.value for s in orders.TRANSITIONS[o.status] if s not in (S.cancelled, S.refunded)),
        }
        for o in rows
    ]


@router.get("/returns")
def returns(db: DbSession = Depends(get_db)):
    rows = db.scalars(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.status == S.refunded)
        .order_by(Order.updated_at.desc())
        .limit(100)
    ).all()
    return [
        {
            "number": o.number,
            "email": o.email,
            "total_cents": o.total_cents,
            "items": [f"{i.product_name} ({i.color}/{i.size})" for i in o.items],
            "updated_at": o.updated_at,
        }
        for o in rows
    ]


@router.get("/stream")
async def admin_stream(request: Request):
    """Live order feed for the dashboard."""
    return StreamingResponse(_sse(request, "orders:*", "order"), media_type="text/event-stream", headers=SSE_HEADERS)
