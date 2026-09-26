import asyncio
import json

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from ..db import get_db
from ..events import broker
from ..models import Product, Variant
from ..schemas import InventoryOut

router = APIRouter(tags=["catalog"])


@router.get("/products")
def products(db: DbSession = Depends(get_db)):
    rows = db.scalars(select(Product).where(Product.active.is_(True)).order_by(Product.id)).all()
    return [
        {
            "slug": p.slug,
            "name": p.name,
            "category": p.category,
            "price_cents": p.price_cents,
            "style_code": p.style_code,
        }
        for p in rows
    ]


@router.get("/inventory/stream")
async def inventory_stream(request: Request, product: str | None = None):
    """Server-sent events: `event: inventory` whenever stock for the product changes."""
    channel = f"inventory:{product}" if product else "inventory:*"
    return StreamingResponse(_sse(request, channel, "inventory"), media_type="text/event-stream", headers=SSE_HEADERS)


@router.get("/inventory/{slug}", response_model=list[InventoryOut])
def inventory(slug: str, db: DbSession = Depends(get_db)):
    product = db.scalar(select(Product).where(Product.slug == slug))
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found.")
    rows = db.scalars(select(Variant).where(Variant.product_id == product.id)).all()
    return [InventoryOut(sku=v.sku, available=v.available) for v in rows]


SSE_HEADERS = {"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no", "Connection": "keep-alive"}


async def _sse(request: Request, channel: str, event: str, heartbeat: float = 15.0):
    q = broker.subscribe(channel)
    try:
        yield "retry: 3000\n\n"
        while True:
            if await request.is_disconnected():
                break
            try:
                payload = await asyncio.wait_for(q.get(), timeout=heartbeat)
                yield f"event: {event}\ndata: {json.dumps(payload)}\n\n"
            except TimeoutError:
                yield ": keep-alive\n\n"
    finally:
        broker.unsubscribe(channel, q)
