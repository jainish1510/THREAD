from conftest import csrf, login_admin, register


def test_register_login_logout(client):
    user = register(client)
    assert user["role"] == "customer"
    assert client.get("/auth/me").json()["email"] == "ada@example.com"

    r = client.post("/auth/logout", headers=csrf(client))
    assert r.status_code == 204
    assert client.get("/auth/me").status_code == 401

    r = client.post("/auth/login", json={"email": "ADA@example.com", "password": "correct-horse-battery"})
    assert r.status_code == 200


def test_duplicate_email_rejected(client):
    register(client)
    r = client.post(
        "/auth/register", json={"email": "ada@example.com", "name": "Ada", "password": "another-long-password"}
    )
    assert r.status_code == 409


def test_wrong_password(client):
    register(client)
    client.cookies.clear()
    r = client.post("/auth/login", json={"email": "ada@example.com", "password": "nope-nope-nope"})
    assert r.status_code == 401
    assert "don't match" in r.json()["detail"]


def test_password_policy_returns_field_errors(client):
    r = client.post("/auth/register", json={"email": "x@example.com", "name": "X", "password": "short"})
    assert r.status_code == 422
    assert r.json()["detail"][0]["field"] == "password"


def test_csrf_required_for_cookie_writes(client):
    register(client)
    r = client.put("/me/measurements", json={"height_cm": 180, "preferred_fit": "regular"})
    assert r.status_code == 403
    r = client.put("/me/measurements", json={"height_cm": 180, "preferred_fit": "regular"}, headers=csrf(client))
    assert r.status_code == 200


def test_rbac_admin_only(client):
    register(client)
    assert client.get("/admin/overview").status_code == 403
    client.cookies.clear()
    assert client.get("/admin/overview").status_code == 401
    login_admin(client)
    assert client.get("/admin/overview").status_code == 200


def test_login_rate_limited(client):
    for _ in range(10):
        client.post("/auth/login", json={"email": "x@example.com", "password": "whatever-pass"})
    r = client.post("/auth/login", json={"email": "x@example.com", "password": "whatever-pass"})
    assert r.status_code == 429
