import json
import logging
import sys
import time
import uuid

from fastapi import FastAPI, Request
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
from starlette.responses import Response

REQUESTS = Counter("thread_http_requests_total", "HTTP requests", ["method", "route", "status"])
LATENCY = Histogram("thread_http_request_seconds", "HTTP request latency", ["method", "route"])
ORDERS = Counter("thread_orders_total", "Orders by lifecycle event", ["event"])
RESERVATION_FAILURES = Counter("thread_inventory_reservation_failures_total", "Checkout attempts that hit stock limits")
REVENUE = Counter("thread_revenue_cents_total", "Captured revenue in cents")


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        for key in ("request_id", "route", "status", "duration_ms", "method"):
            if hasattr(record, key):
                payload[key] = getattr(record, key)
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        return json.dumps(payload)


def configure_logging(level: str = "INFO") -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.handlers[:] = [handler]
    root.setLevel(level)
    logging.getLogger("uvicorn.access").disabled = True


def install(app: FastAPI) -> None:
    log = logging.getLogger("thread.http")

    @app.middleware("http")
    async def observe(request: Request, call_next):
        request_id = request.headers.get("x-request-id") or uuid.uuid4().hex[:16]
        start = time.perf_counter()
        status = 500
        try:
            response = await call_next(request)
            status = response.status_code
            response.headers["x-request-id"] = request_id
            return response
        finally:
            route = request.scope.get("route")
            path = getattr(route, "path", "unmatched")
            elapsed = time.perf_counter() - start
            if path not in ("/metrics", "/healthz"):
                REQUESTS.labels(request.method, path, str(status)).inc()
                LATENCY.labels(request.method, path).observe(elapsed)
                log.info(
                    "request",
                    extra={
                        "request_id": request_id,
                        "method": request.method,
                        "route": path,
                        "status": status,
                        "duration_ms": round(elapsed * 1000, 1),
                    },
                )

    @app.get("/metrics", include_in_schema=False)
    def metrics() -> Response:
        return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

    _maybe_tracing(app)


def _maybe_tracing(app: FastAPI) -> None:
    """OpenTelemetry tracing, enabled when the SDK is installed and an OTLP endpoint is configured."""
    import os

    if not os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT"):
        return
    try:  # pragma: no cover - optional dependency
        from opentelemetry import trace
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor

        provider = TracerProvider(resource=Resource.create({"service.name": "thread-api"}))
        provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
        trace.set_tracer_provider(provider)
        FastAPIInstrumentor.instrument_app(app)
        logging.getLogger("thread").info("opentelemetry tracing enabled")
    except ImportError:
        logging.getLogger("thread").warning("OTEL endpoint set but opentelemetry packages are not installed")
