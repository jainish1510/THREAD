# THREAD

**Clothes with nothing to hide.** A premium direct-to-consumer fashion platform for a fictional brand: published cost breakdowns, traceable factories, a digital passport for every garment, intelligent search, a personalised fit engine and live inventory — inside a quiet, editorial interface.

> THREAD is fictional. Every product, cost, factory, audit and order in this repository is simulated.

```
apps/web          Next.js 16 · React 19 · TypeScript · Tailwind v4 · Framer Motion · TanStack Query · Zustand · d3
services/api      FastAPI · SQLAlchemy 2 · PostgreSQL / SQLite · Redis (optional) · Stripe · Prometheus
packages/catalog  The single source of truth for the catalog (generated JSON, read by both apps)
infra/            Prometheus + Grafana provisioning, Kubernetes manifests
```

## Run it

**Everything in Docker** (Postgres, Redis, API, web, Prometheus, Grafana):

```bash
docker compose up --build
# Storefront  http://localhost:3000
# API docs    http://localhost:8000/docs
# Grafana     http://localhost:3001
```

**Or locally, for development:**

```bash
# API — SQLite by default, seeds the catalog + 180 days of simulated order history on first start
cd services/api
python -m venv .venv && . .venv/bin/activate && pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000

# Web — proxies /api/* to the API so session cookies stay first-party
cd apps/web
npm install && npm run dev   # http://localhost:3000
```

Demo admin: `admin@example.com` / `thread-admin-2026` → `/admin`.

**Payments.** Without Stripe keys, checkout runs in a clearly-labelled *test mode*: card `4242 4242 4242 4242` succeeds, `4000 0000 0000 0002` declines. Set `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` (API) and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (web) to switch to the Stripe Payment Element (cards, Apple Pay, Google Pay) confirmed via signed webhooks.

**Google sign-in** turns on when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set; otherwise the button is not shown.

## Tests

```bash
cd services/api && pytest            # 31 tests: auth, CSRF, RBAC, rate limits, oversell under concurrency,
                                     # state machine, webhooks (idempotency, amount check), analytics
TEST_DATABASE_URL=postgresql+psycopg://… pytest   # same suite on PostgreSQL
cd apps/web && npm test              # search parser, fit engine, checkout validation
cd apps/web && npm run lint && npm run typecheck
BASE_URL=http://localhost:3000 npm run e2e        # browser smoke test of the full purchase + live tracking flow
```

CI (`.github/workflows/ci.yml`) runs lint, types, unit tests and a production build for the web app; ruff and the API suite on SQLite **and** PostgreSQL; and on `main` builds and pushes both images to GHCR.

## What's inside

### Storefront
- **Design system** — warm neutrals with one earth accent, Inter + selective Instrument Serif, 1px rules, a strict 4→128 spacing scale, a 150–500 ms motion vocabulary, `prefers-reduced-motion` respected globally.
- **Product imagery** is rendered SVG — technical flat-lays with fabric texture per material — so every colour variant is exact and each image weighs a few KB. Swap `GarmentArt` for photography when you have it.
- **Shop** — category rail plus one filter drawer (size, colour, material, price, fit, availability) that becomes a bottom sheet on mobile; URL-synced and shareable.
- **Product page** — gallery (swipeable on mobile), live per-size stock, sticky mobile add-to-bag, *Why $48?* (animated breakdown), *Who made it?*, *What is it made from?*, the supply-chain map, and a QR digital passport. Transparency sections collapse on mobile.
- **Intelligent search** — deterministic natural-language parsing (`black shirt under $60 for hot weather` → `color=black · category=shirt · price<$60 · weather=hot`), shown quietly as interpreted filters. Press `/` anywhere.
- **Fit engine** — compares body measurements (or estimates from height/weight) with garment measurements and each block's designed ease; returns a size, a confidence, reasons, and a body-vs-garment visualisation.
- **Bag & checkout** — free-shipping meter (a real $100 rule), server-priced quotes, Information → Shipping → Payment → Review → Confirmation, inline validation with announced errors, a 15-minute stock reservation timer.
- **Order tracking** — timeline and route map (factory → New York → Nashville → you) updated in real time over server-sent events.
- **Account** — overview, orders, wishlist, measurements, digital passports for every garment owned, addresses, payment, preferences (optimistic updates).
- **Transparency pages** — materials explorer, factory profiles (process, audit, history), supply-chain explorer, journal.

### API
- **Auth** — scrypt password hashing, hashed server-side sessions in httpOnly cookies, double-submit CSRF on cookie-authenticated writes, RBAC (`customer` / `admin`), optional Google OAuth.
- **Inventory consistency** — every stock change is a single conditional `UPDATE … WHERE on_hand - reserved >= qty`, backed by CHECK constraints; checkout reserves, payment commits, cancellation/expiry releases, refunds restock. A background reaper releases abandoned reservations. A 12-way concurrent test proves no overselling.
- **Order state machine** — explicit legal transitions with inventory side effects and an event log per order.
- **Payments** — Stripe PaymentIntents, signed + idempotent webhooks with amount verification; offline simulator for test mode.
- **Real time** — SSE streams for inventory, orders and the admin feed; Redis pub/sub fan-out across replicas when `REDIS_URL` is set.
- **Operations** — JSON structured logs with request IDs, Prometheus metrics (HTTP + business: orders, revenue, stock-limited checkouts), optional OpenTelemetry tracing (`OTEL_EXPORTER_OTLP_ENDPOINT`), rate limiting (memory or Redis), security headers.

### Admin console (`/admin`)
KPIs as a single ruled row (revenue, orders, conversion, inventory health, returns — each vs the previous period), revenue and order charts with hover readouts and a table view, top products, category mix, fulfilment pipeline, live activity; orders (advance through the state machine), inventory (optimistic stock edits), products, customers, shipping, returns, factories, materials, production batches.

## Not built (yet)

Being explicit, so nothing here is mistaken for a working feature:

- **Kafka, OpenSearch, Terraform/AWS** — not implemented. Search runs client-side over a 16-product catalog; events use SSE + optional Redis.
- **Mapbox / Three.js** — maps use `d3-geo` with bundled coastlines (no token needed); no 3D.
- **Saved payment methods** — Stripe Customers aren't attached yet; the account page says so.
- **Migrations** — tables are created with `create_all`; add Alembic before evolving the schema in production.
- **Email** — order confirmations are not sent.
- **Photography & CDN** — imagery is generated SVG; there is no object storage integration.
