import os
import tempfile

import pytest

# Isolated database per test session; no simulated history for fast, deterministic tests.
_tmp = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = os.environ.get("TEST_DATABASE_URL") or f"sqlite:///{_tmp}/test.db"
os.environ["SEED_DEMO_HISTORY"] = "false"
os.environ["STRIPE_SECRET_KEY"] = ""
os.environ["STRIPE_WEBHOOK_SECRET"] = ""

from fastapi.testclient import TestClient  # noqa: E402

from app import ratelimit  # noqa: E402
from app.db import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.seed import seed  # noqa: E402


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed(db)
    ratelimit.reset()
    yield


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def csrf(client: TestClient) -> dict[str, str]:
    return {"X-CSRF-Token": client.cookies.get("thread_csrf", "")}


def register(client: TestClient, email="ada@example.com", password="correct-horse-battery"):
    r = client.post("/auth/register", json={"email": email, "name": "Ada Lovelace", "password": password})
    assert r.status_code == 201, r.text
    return r.json()


def login_admin(client: TestClient):
    r = client.post("/auth/login", json={"email": "admin@example.com", "password": "thread-admin-2026"})
    assert r.status_code == 200, r.text


ADDRESS = {
    "name": "Ada Lovelace",
    "line1": "1 Main Street",
    "city": "Nashville",
    "region": "TN",
    "postal_code": "37203",
    "country": "US",
}


def checkout(client: TestClient, items, email="guest@example.com", headers=None):
    return client.post(
        "/checkout",
        json={"email": email, "items": items, "shipping_address": ADDRESS, "shipping_method": "standard"},
        headers=headers or {},
    )
