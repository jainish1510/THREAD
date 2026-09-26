"""
Seed the database from the shared catalog, create the admin account, and
(optionally) generate simulated order history so analytics have shape.
Simulated orders are flagged `is_simulated` and never touch live inventory.
"""

import json
import logging
import random
import secrets
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from . import models
from .config import get_settings
from .security import hash_password

log = logging.getLogger("thread.seed")

CITIES = [
    ("New York", "NY"),
    ("Brooklyn", "NY"),
    ("Los Angeles", "CA"),
    ("San Francisco", "CA"),
    ("Chicago", "IL"),
    ("Austin", "TX"),
    ("Seattle", "WA"),
    ("Portland", "OR"),
    ("Nashville", "TN"),
    ("Denver", "CO"),
    ("Boston", "MA"),
    ("Philadelphia", "PA"),
    ("Atlanta", "GA"),
    ("Minneapolis", "MN"),
    ("Miami", "FL"),
]


def load_catalog() -> dict:
    with open(get_settings().catalog_path) as f:
        return json.load(f)


def seed(db: Session) -> None:
    catalog = load_catalog()
    if not db.scalar(select(func.count()).select_from(models.Product)):
        _seed_catalog(db, catalog)
    s = get_settings()
    if not db.scalar(select(models.User).where(models.User.email == s.admin_email)):
        db.add(
            models.User(
                email=s.admin_email,
                name="THREAD Ops",
                password_hash=hash_password(s.admin_password),
                role=models.Role.admin,
            )
        )
        db.commit()
        log.info("created admin account %s", s.admin_email)
    if s.seed_demo_history and not db.scalar(
        select(func.count()).select_from(models.Order).where(models.Order.is_simulated.is_(True))
    ):
        _seed_history(db, catalog)


def _seed_catalog(db: Session, catalog: dict) -> None:
    for f in catalog["factories"]:
        db.add(
            models.Factory(
                slug=f["slug"],
                name=f["name"],
                city=f["city"],
                country=f["country"],
                workers=f["workers"],
                last_audit=date.fromisoformat(f["lastAudit"]),
                audit_score=f["auditScore"],
                certifications=f["certifications"],
            )
        )
    for m in catalog["materials"]:
        db.add(models.Material(slug=m["slug"], name=m["name"], origin=m["origin"], certification=m["certification"]))
    db.flush()
    rng = random.Random(7)
    for p in catalog["products"]:
        product = models.Product(
            slug=p["slug"],
            style_code=p["styleCode"],
            name=p["name"],
            category=p["category"],
            price_cents=p["price"] * 100,
            material_slug=p["materialSlug"],
            factory_slug=p["factorySlug"],
            batch=p["batch"],
        )
        for v in p["variants"]:
            product.variants.append(
                models.Variant(sku=v["sku"], color=v["color"], size=v["size"], on_hand=v["inventory"], reserved=0)
            )
        db.add(product)
        db.flush()
        db.add(
            models.Batch(
                code=p["batch"],
                product_id=product.id,
                factory_slug=p["factorySlug"],
                units=sum(v["inventory"] for v in p["variants"]) + rng.randint(200, 900),
                manufactured=p["manufactured"],
                qc_pass_rate=round(rng.uniform(0.975, 0.998), 3),
                status="received",
            )
        )
    db.commit()
    log.info("seeded %d products", len(catalog["products"]))


def _seed_history(db: Session, catalog: dict, days: int = 180) -> None:
    rng = random.Random(2026)
    products = db.scalars(select(models.Product)).all()
    variants = {p.id: p.variants for p in products}
    weights = [
        3.0 if p.category in ("tees", "shirts") else 1.6 if p.category in ("knitwear", "denim", "sweats") else 1.0
        for p in products
    ]
    today = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
    S = models.OrderStatus
    counter = iter(range(1, 10**6))
    first_names = [
        "Ada",
        "Sam",
        "Noor",
        "Luca",
        "Mia",
        "Theo",
        "Iris",
        "Kai",
        "Maya",
        "Leo",
        "Ines",
        "Omar",
        "Zoe",
        "Ravi",
        "Ana",
    ]

    for d in range(days, -1, -1):
        day = today - timedelta(days=d)
        # Growth trend + weekly seasonality + noise.
        base = 9 + (days - d) * 0.045
        weekday = day.weekday()
        mult = 1.25 if weekday in (5, 6) else 0.9 if weekday == 1 else 1.0
        n_orders = max(1, int(rng.gauss(base * mult, 2.2)))
        sessions = int(n_orders / rng.uniform(0.042, 0.054))
        db.merge(models.DailyTraffic(day=day.date(), sessions=sessions))
        for _ in range(n_orders):
            created = day + timedelta(seconds=rng.randint(0, 86399))
            n_items = 1 if rng.random() < 0.6 else 2 if rng.random() < 0.8 else 3
            items, subtotal = [], 0
            for p in rng.choices(products, weights=weights, k=n_items):
                v = rng.choice(variants[p.id])
                items.append(
                    models.OrderItem(
                        variant_id=v.id,
                        sku=v.sku,
                        product_slug=p.slug,
                        product_name=p.name,
                        color=v.color,
                        size=v.size,
                        unit_price_cents=p.price_cents,
                        quantity=1,
                        batch=p.batch,
                    )
                )
                subtotal += p.price_cents
            shipping = 0 if subtotal >= 10_000 else 800
            age = d
            if age > 10:
                status = S.refunded if rng.random() < 0.032 else S.delivered
            elif age > 5:
                status = rng.choice([S.delivered, S.delivered, S.out_for_delivery])
            elif age > 2:
                status = rng.choice([S.shipped, S.shipped, S.preparing])
            else:
                status = rng.choice([S.paid, S.preparing])
            city, region = rng.choice(CITIES)
            order = models.Order(
                number=f"SIM-{next(counter):06d}",
                email=f"{rng.choice(first_names).lower()}{rng.randint(10, 9999)}@example.com",
                status=status,
                subtotal_cents=subtotal,
                shipping_cents=shipping,
                tax_cents=0,
                total_cents=subtotal + shipping,
                shipping_method="standard",
                payment_mode="test",
                access_token=secrets.token_urlsafe(16),
                is_simulated=True,
                shipping_address={
                    "name": "Simulated Customer",
                    "line1": "1 Demo Street",
                    "line2": None,
                    "city": city,
                    "region": region,
                    "postal_code": "00000",
                    "country": "US",
                },
                created_at=created,
                updated_at=created,
            )
            order.items = items
            order.events = [models.OrderEvent(status=status, note="Simulated history", created_at=created)]
            db.add(order)
        if d % 30 == 0:
            db.flush()
    db.commit()
    log.info("seeded simulated order history")
