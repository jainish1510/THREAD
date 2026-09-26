import hmac
from datetime import UTC, datetime

from fastapi import Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from . import models
from .db import get_db
from .security import aware, token_hash

SESSION_COOKIE = "thread_session"
CSRF_COOKIE = "thread_csrf"
SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def optional_user(request: Request, db: DbSession = Depends(get_db)) -> models.User | None:
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        return None
    session = db.scalar(select(models.Session).where(models.Session.token_hash == token_hash(token)))
    if session is None or aware(session.expires_at) < datetime.now(UTC):
        return None
    # Double-submit CSRF protection for cookie-authenticated writes.
    if request.method not in SAFE_METHODS:
        header = request.headers.get("x-csrf-token", "")
        if not hmac.compare_digest(header, session.csrf_token):
            raise HTTPException(
                status_code=403, detail="Your session could not be verified. Please refresh and try again."
            )
    request.state.session = session
    return session.user


def require_user(user: models.User | None = Depends(optional_user)) -> models.User:
    if user is None:
        raise HTTPException(status_code=401, detail="Please sign in.")
    return user


def require_admin(user: models.User = Depends(require_user)) -> models.User:
    if user.role != models.Role.admin:
        raise HTTPException(status_code=403, detail="Admin access required.")
    return user
