import secrets
from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy import delete, select
from sqlalchemy.orm import Session as DbSession

from .. import models
from ..config import get_settings
from ..db import get_db
from ..deps import CSRF_COOKIE, SESSION_COOKIE, optional_user, require_user
from ..ratelimit import limit
from ..schemas import LoginIn, RegisterIn, UserOut
from ..security import hash_password, new_token, token_hash, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


def start_session(db: DbSession, response: Response, user: models.User, request: Request) -> None:
    s = get_settings()
    token = new_token()
    csrf = secrets.token_urlsafe(24)
    db.add(
        models.Session(
            token_hash=token_hash(token),
            csrf_token=csrf,
            user_id=user.id,
            expires_at=datetime.now(UTC) + timedelta(days=s.session_days),
            user_agent=(request.headers.get("user-agent") or "")[:255],
        )
    )
    db.commit()
    common = {
        "max_age": s.session_days * 86400,
        "secure": s.cookie_secure,
        "samesite": "lax",
        "domain": s.cookie_domain,
        "path": "/",
    }
    response.set_cookie(SESSION_COOKIE, token, httponly=True, **common)
    # Readable by the web app so it can echo it back in X-CSRF-Token.
    response.set_cookie(CSRF_COOKIE, csrf, httponly=False, **common)


@router.post(
    "/register",
    response_model=UserOut,
    status_code=201,
    dependencies=[Depends(limit("auth", get_settings().auth_rate_limit_per_minute))],
)
def register(body: RegisterIn, request: Request, response: Response, db: DbSession = Depends(get_db)):
    email = body.email.lower()
    if db.scalar(select(models.User).where(models.User.email == email)):
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    user = models.User(email=email, name=body.name, password_hash=hash_password(body.password))
    db.add(user)
    db.flush()
    # Adopt guest orders placed with this email.
    for order in db.scalars(select(models.Order).where(models.Order.email == email, models.Order.user_id.is_(None))):
        order.user_id = user.id
    start_session(db, response, user, request)
    return user


@router.post(
    "/login", response_model=UserOut, dependencies=[Depends(limit("auth", get_settings().auth_rate_limit_per_minute))]
)
def login(body: LoginIn, request: Request, response: Response, db: DbSession = Depends(get_db)):
    user = db.scalar(select(models.User).where(models.User.email == body.email.lower()))
    if not verify_password(body.password, user.password_hash if user else None) or user is None:
        raise HTTPException(status_code=401, detail="That email and password don't match.")
    start_session(db, response, user, request)
    return user


@router.post("/logout", status_code=204)
def logout(request: Request, response: Response, db: DbSession = Depends(get_db), _user=Depends(optional_user)):
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        db.execute(delete(models.Session).where(models.Session.token_hash == token_hash(token)))
        db.commit()
    s = get_settings()
    response.delete_cookie(SESSION_COOKIE, domain=s.cookie_domain, path="/")
    response.delete_cookie(CSRF_COOKIE, domain=s.cookie_domain, path="/")


@router.get("/me", response_model=UserOut)
def me(user: models.User = Depends(require_user)):
    return user


@router.get("/providers")
def providers():
    s = get_settings()
    return {"password": True, "google": bool(s.google_client_id and s.google_client_secret)}


# ---- OAuth 2.0 (Google, authorization code flow with state) ----
GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO = "https://openidconnect.googleapis.com/v1/userinfo"


def _redirect_uri() -> str:
    return f"{get_settings().public_web_url}/api/auth/oauth/google/callback"


@router.get("/oauth/google/start")
def google_start():
    s = get_settings()
    if not (s.google_client_id and s.google_client_secret):
        raise HTTPException(status_code=404, detail="Google sign-in is not configured.")
    state = secrets.token_urlsafe(24)
    params = {
        "client_id": s.google_client_id,
        "redirect_uri": _redirect_uri(),
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "prompt": "select_account",
    }
    resp = RedirectResponse(f"{GOOGLE_AUTH}?{urlencode(params)}")
    resp.set_cookie("thread_oauth_state", state, max_age=600, httponly=True, secure=s.cookie_secure, samesite="lax")
    return resp


@router.get("/oauth/google/callback")
def google_callback(
    request: Request, code: str, state: str, db: DbSession = Depends(get_db)
):  # pragma: no cover - network
    s = get_settings()
    if not state or state != request.cookies.get("thread_oauth_state"):
        raise HTTPException(status_code=400, detail="Sign-in expired. Please try again.")
    with httpx.Client(timeout=10) as client:
        tok = (
            client.post(
                GOOGLE_TOKEN,
                data={
                    "code": code,
                    "client_id": s.google_client_id,
                    "client_secret": s.google_client_secret,
                    "redirect_uri": _redirect_uri(),
                    "grant_type": "authorization_code",
                },
            )
            .raise_for_status()
            .json()
        )
        info = (
            client.get(GOOGLE_USERINFO, headers={"Authorization": f"Bearer {tok['access_token']}"})
            .raise_for_status()
            .json()
        )
    if not info.get("email_verified"):
        raise HTTPException(status_code=400, detail="Your Google email is not verified.")
    email = info["email"].lower()
    user = db.scalar(select(models.User).where(models.User.email == email))
    if user is None:
        user = models.User(
            email=email,
            name=info.get("name") or email.split("@")[0],
            oauth_provider="google",
            oauth_subject=info["sub"],
        )
        db.add(user)
        db.flush()
    resp = RedirectResponse(f"{s.public_web_url}/account")
    resp.delete_cookie("thread_oauth_state")
    start_session(db, resp, user, request)
    return resp
