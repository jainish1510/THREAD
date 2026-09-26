import asyncio
import contextlib
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from . import observability
from .config import get_settings
from .db import Base, SessionLocal, engine
from .events import broker
from .ratelimit import limit
from .routers import admin, auth, catalog, checkout, me, webhooks
from .seed import seed
from .services.orders import expire_stale_reservations

log = logging.getLogger("thread")


async def _reservation_reaper(interval: float = 60.0) -> None:
    """Release stock held by abandoned checkouts."""
    while True:
        await asyncio.sleep(interval)
        try:
            with SessionLocal() as db:
                n = await asyncio.to_thread(expire_stale_reservations, db)
                if n:
                    log.info("released %d expired reservations", n)
        except Exception:  # pragma: no cover
            log.exception("reservation reaper failed")


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed(db)
    await broker.start()
    reaper = asyncio.create_task(_reservation_reaper())
    yield
    reaper.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await reaper
    await broker.stop()


def create_app() -> FastAPI:
    settings = get_settings()
    observability.configure_logging()
    app = FastAPI(
        title="THREAD API",
        version="1.0.0",
        lifespan=lifespan,
        docs_url=None if settings.is_production else "/docs",
        dependencies=[],
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Content-Type", "X-CSRF-Token", "X-Request-ID"],
    )

    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        if settings.is_production:
            response.headers.setdefault("Strict-Transport-Security", "max-age=63072000; includeSubDomains")
        return response

    observability.install(app)

    @app.exception_handler(RequestValidationError)
    async def validation_error(_: Request, exc: RequestValidationError):
        # Field-level errors in a shape the web app can map to inputs.
        errors = [
            {"field": ".".join(str(p) for p in e["loc"] if p != "body"), "msg": e["msg"].removeprefix("Value error, ")}
            for e in exc.errors()
        ]
        return JSONResponse(status_code=422, content={"detail": errors})

    @app.get("/healthz", include_in_schema=False)
    def healthz():
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ok"}

    from fastapi import Depends

    general = [Depends(limit("api"))]
    for r in (auth.router, catalog.router, checkout.router, me.router, admin.router):
        app.include_router(r, dependencies=general)
    app.include_router(webhooks.router)
    return app


app = create_app()
