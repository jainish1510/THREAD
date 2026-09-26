"""Fixed-window rate limiting per client and route group (in-memory, or Redis when configured)."""

import time
from collections import defaultdict
from threading import Lock

from fastapi import HTTPException, Request

from .config import get_settings


class _MemoryWindow:
    def __init__(self) -> None:
        self._hits: dict[str, tuple[int, int]] = defaultdict(lambda: (0, 0))
        self._lock = Lock()

    def hit(self, key: str, window: int) -> int:
        now = int(time.time()) // window
        with self._lock:
            bucket, count = self._hits[key]
            count = count + 1 if bucket == now else 1
            self._hits[key] = (now, count)
            if len(self._hits) > 50_000:  # crude memory bound
                self._hits.clear()
            return count


_memory = _MemoryWindow()
_redis = None


def _redis_client():
    global _redis
    url = get_settings().redis_url
    if not url:
        return None
    if _redis is None:  # pragma: no cover - depends on infra
        import redis

        _redis = redis.from_url(url)
    return _redis


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def limit(group: str, per_minute: int | None = None):
    """FastAPI dependency: `Depends(limit("auth", 10))`."""

    def dependency(request: Request) -> None:
        settings = get_settings()
        cap = per_minute or settings.rate_limit_per_minute
        key = f"rl:{group}:{client_ip(request)}"
        r = _redis_client()
        if r is not None:  # pragma: no cover - depends on infra
            count = r.incr(key)
            if count == 1:
                r.expire(key, 60)
        else:
            count = _memory.hit(key, 60)
        if count > cap:
            raise HTTPException(
                status_code=429, detail="Too many requests. Please wait a moment.", headers={"Retry-After": "60"}
            )

    return dependency


def reset() -> None:
    """Test helper."""
    _memory._hits.clear()
