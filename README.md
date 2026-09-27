# THREAD

**Clothes with nothing to hide.** A premium direct-to-consumer fashion platform for a fictional brand. Every product page publishes its cost breakdown, factory, materials and supply chain. Each garment gets a digital passport. There is plain-language search, a personalised size finder and live inventory, all inside a quiet, editorial interface.

> THREAD is fictional. Every product, cost, factory, audit and order in this repository is simulated.

| Part | What it is | Tech |
|---|---|---|
| `apps/web` | Storefront + admin console | Next.js 16, React 19, TypeScript, Tailwind CSS 4, Framer Motion, TanStack Query, Zustand, d3 |
| `services/api` | Commerce API | Python 3.11, FastAPI, SQLAlchemy 2, SQLite or PostgreSQL, optional Redis, Stripe |
| `packages/catalog` | The product catalog both apps read | One generated JSON file |
| `infra/` | Monitoring + deployment | Prometheus, Grafana, Kubernetes manifests |

---

## Contents

1. [Prerequisites](#1-prerequisites)
2. [Get the code](#2-get-the-code)
3. [Run with Docker (easiest)](#3-run-with-docker-easiest)
4. [Run without Docker (for development)](#4-run-without-docker-for-development)
5. [Try it out](#5-try-it-out)
6. [Run the tests](#6-run-the-tests)
7. [Configuration](#7-configuration)
8. [Optional: PostgreSQL, Redis, Stripe, Google sign-in](#8-optional-postgresql-redis-stripe-google-sign-in)
9. [Troubleshooting](#9-troubleshooting)
10. [Project structure](#10-project-structure)
11. [What's inside](#11-whats-inside)
12. [Not built yet](#12-not-built-yet)

---

## 1. Prerequisites

Choose **one** of the two ways to run the project.

| To run… | You need |
|---|---|
| **With Docker** (section 3) | Git, and [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine 24+ with Compose v2) |
| **Without Docker** (section 4) | Git, **Node.js 22+** (npm 10+ comes with it), **Python 3.11+** |

Check what you have:

```bash
git --version
docker --version && docker compose version   # only for Docker
node --version     # must print v22 or newer
npm --version      # must print 10 or newer
python3 --version  # must print 3.11 or newer  (on Windows: python --version)
```

<details>
<summary><strong>Installing the prerequisites</strong></summary>

**macOS** (with [Homebrew](https://brew.sh)):

```bash
brew install git node@22 python@3.11
brew install --cask docker        # optional, for section 3
```

**Windows** (PowerShell):

```powershell
winget install Git.Git
winget install OpenJS.NodeJS.LTS
winget install Python.Python.3.11
winget install Docker.DockerDesktop   # optional, for section 3
```

Close and reopen the terminal afterwards so the new commands are on your `PATH`.

**Ubuntu / Debian:**

```bash
sudo apt update
sudo apt install -y git python3 python3-venv python3-pip
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
# Docker (optional): https://docs.docker.com/engine/install/ubuntu/
```

</details>

## 2. Get the code

```bash
git clone https://github.com/jainish1510/THREAD.git
cd THREAD
```

All commands below start from this `THREAD` folder.

## 3. Run with Docker (easiest)

This starts the complete stack: web app, API, PostgreSQL, Redis, Prometheus and Grafana.

```bash
docker compose up --build
```

The first run downloads the base images and builds both apps, which takes a few minutes. The stack is ready when the logs show `Ready` from `web` and `Application startup complete` from `api`. Then open:

| URL | What |
|---|---|
| http://localhost:3000 | The storefront |
| http://localhost:3000/admin | Admin console (sign in with the account in section 5) |
| http://localhost:8000/docs | Interactive API documentation |
| http://localhost:3001 | Grafana. Open *Dashboards → THREAD → THREAD API* |
| http://localhost:9090 | Prometheus |

Useful commands:

```bash
docker compose up --build -d   # run in the background
docker compose logs -f api     # follow the API logs
docker compose down            # stop everything (data is kept)
docker compose down -v         # stop and delete the database, for a fresh start
```

## 4. Run without Docker (for development)

You need **two terminals**: one for the API, one for the web app. By default the API uses a local SQLite file, so you don't need a database server.

### Terminal 1: the API

**macOS / Linux:**

```bash
cd services/api
python3 -m venv .venv                      # create an isolated Python environment (first time only)
source .venv/bin/activate                  # activate it (every new terminal)
pip install -r requirements-dev.txt        # install packages (first time, and after pulling changes)
uvicorn app.main:app --reload --port 8000  # start the API
```

**Windows (PowerShell):**

```powershell
cd services\api
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000
```

> If PowerShell refuses to run `Activate.ps1`, run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, then try again.

On first start the API creates `thread.db` and fills it with:
- the 16 catalog products,
- the admin account,
- 180 days of simulated order history for the dashboards.

Check it's running: http://localhost:8000/healthz should show `{"status":"ok"}`.

### Terminal 2: the web app

```bash
cd apps/web
npm ci          # install packages exactly as locked (first time, and after pulling changes)
npm run dev     # start the dev server with hot reload
```

Open **http://localhost:3000**.

The web app forwards every request under `/api/*` to the API at `http://localhost:8000`, so both must be running. To point it somewhere else, copy `apps/web/.env.example` to `apps/web/.env.local` and change `API_INTERNAL_URL`.

**Production mode**, which is faster and matches a real deployment:

```bash
cd apps/web
npm run build
npm start       # serves on http://localhost:3000
```

## 5. Try it out

| Try | How |
|---|---|
| Browse | http://localhost:3000/shop. Use the category row and the **Filter** drawer. |
| A product page | http://localhost:3000/products/everyday-tee. Pick a size to see live stock. Scroll for *Why $48?*, the factory, the material and the supply-chain map. Open **Digital passport**. |
| Size finder | Click **Find your size** on any product, or go to http://localhost:3000/fit |
| Search | Press `/` anywhere and type `black shirt under $60 for hot weather` |
| Buy something | Add to bag, then **Checkout**. In test mode use card **4242 4242 4242 4242**, any future expiry date and any CVC. Card **4000 0000 0000 0002** shows a decline. |
| Live tracking | After ordering, click **Track order**. Keep that tab open. |
| Admin | In another browser or a private window, go to http://localhost:3000/login and sign in as **admin@example.com** / **thread-admin-2026**. Open **Orders**, find your order and click **Prepare**, then **Ship**. The tracking tab updates by itself. |
| Live stock | Keep a product page open with a size selected. Buy that size in another window, and the count drops without a refresh. |
| Account | **Account → Create account**. Orders, wishlist, measurements, passports, addresses and preferences are all live. |

## 6. Run the tests

**API**: 31 tests covering sign-in, CSRF, roles, rate limits, overselling under concurrent checkouts, the order state machine, payment webhooks and analytics:

```bash
cd services/api
source .venv/bin/activate          # Windows: .venv\Scripts\Activate.ps1
pytest                             # run the tests
ruff check app tests               # lint
ruff format --check app tests      # formatting
```

To run the same tests against PostgreSQL, use an **empty** database, because the tests reset it:

```bash
TEST_DATABASE_URL=postgresql+psycopg://thread:thread@localhost:5432/thread_test pytest
```

**Web**: unit tests for search, the size finder and checkout validation, plus lint, types and the production build:

```bash
cd apps/web
npm test
npm run lint
npm run typecheck
npm run build
```

**End-to-end**: a real browser runs the whole journey. It goes product page → bag → checkout (a declined card, then a good one) → order tracking. Then an admin ships the order, and the test confirms the customer's tracking page updates live. Start the API and web app first (section 3 or 4), then:

```bash
cd apps/web
npx playwright-core install chromium          # one-time browser download
BASE_URL=http://localhost:3000 npm run e2e     # prints OK/FAIL per step; exit code 1 on failure
```

On Windows PowerShell, set the variable first: `$env:BASE_URL="http://localhost:3000"; npm run e2e`.

GitHub Actions (`.github/workflows/ci.yml`) runs all of the above except end-to-end on every push and pull request. On `main` it also builds and publishes Docker images to GHCR.

## 7. Configuration

Everything works with the defaults. To change something:

- **API:** copy `services/api/.env.example` to `services/api/.env`.
- **Web app:** copy `apps/web/.env.example` to `apps/web/.env.local`.

Each file documents every setting. The main ones:

| Variable | Where | Default | Purpose |
|---|---|---|---|
| `DATABASE_URL` | API | `sqlite:///./thread.db` | Database connection |
| `REDIS_URL` | API | *(empty)* | Shares live events and rate limits across API instances |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | API | `admin@example.com` / `thread-admin-2026` | Admin account created on first start |
| `SEED_DEMO_HISTORY` | API | `true` | Generate simulated orders for the dashboards |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | API | *(empty)* | Real payments. When empty, checkout runs in test mode. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | API | *(empty)* | Google sign-in |
| `API_INTERNAL_URL` | Web | `http://localhost:8000` | Where the web app sends `/api/*` requests. It's read at runtime, so the same build works anywhere. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Web | *(empty)* | Stripe's publishable key. Must be set **before** `npm run build`. |
| `NEXT_PUBLIC_SITE_URL` | Web | `http://localhost:3000` | Used for links inside passport QR codes |

## 8. Optional: PostgreSQL, Redis, Stripe, Google sign-in

**PostgreSQL / Redis without the full Docker stack:**

```bash
docker compose up -d postgres redis
```

Then add these to `services/api/.env` before starting the API:

```bash
DATABASE_URL=postgresql+psycopg://thread:thread@localhost:5432/thread
REDIS_URL=redis://localhost:6379/0
```

PostgreSQL listens on `localhost:5432` and Redis on `localhost:6379`. If you already run either locally, stop it first or change the left-hand port in `docker-compose.yml`.

**Stripe (real test-mode payments with cards, Apple Pay and Google Pay):**

1. Create a free [Stripe](https://dashboard.stripe.com/test/apikeys) account and copy the test keys.
2. Set `STRIPE_SECRET_KEY=sk_test_…` in `services/api/.env`.
3. Set `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_…` in `apps/web/.env.local`, then restart or rebuild the web app.
4. Forward webhooks with the [Stripe CLI](https://docs.stripe.com/stripe-cli):
   ```bash
   stripe listen --forward-to localhost:8000/webhooks/stripe
   ```
   It prints a secret starting with `whsec_`. Put it in `STRIPE_WEBHOOK_SECRET` and restart the API.

**Google sign-in:** create an OAuth client in the [Google Cloud console](https://console.cloud.google.com/apis/credentials) with the redirect URI `http://localhost:3000/api/auth/oauth/google/callback`. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `services/api/.env`. The **Continue with Google** button then appears on the sign-in page.

## 9. Troubleshooting

| Problem | Fix |
|---|---|
| Pages load but stock shows "Snapshot", or forms say "We couldn't reach THREAD" | The API isn't running. Start it (section 4, terminal 1) and check http://localhost:8000/healthz |
| `Port 3000/8000/5432/6379 is already in use` | Stop the other process, or pick new ports: `uvicorn … --port 8001` with `API_INTERNAL_URL=http://localhost:8001`, and `npm run dev -- -p 3002` |
| `python3: command not found` (Windows) | Use `python` instead of `python3` |
| `npm ci` fails with an engine or version error | Upgrade to Node.js 22 or newer |
| You want a clean slate | Stop the API and delete `services/api/thread.db`, or run `docker compose down -v` for Docker. The next start re-seeds everything. |
| You edited `packages/catalog/build.mjs` | Regenerate the catalog with `node packages/catalog/build.mjs`. Then delete `thread.db` so the API re-seeds. |
| The bag has items that no longer exist | Clear the site's local storage, or remove the items in the bag |

## 10. Project structure

```
THREAD/
├── apps/web/                  Next.js storefront + admin console
│   ├── src/app/               Pages (shop, products, checkout, account, admin, …)
│   ├── src/components/        UI components (garment art, product, checkout, admin charts, …)
│   ├── src/lib/               Search parser, fit engine, validation, API client (+ unit tests)
│   ├── src/proxy.ts           Forwards /api/* to the API at request time
│   └── e2e/smoke.mjs          Browser end-to-end test
├── services/api/              FastAPI service
│   ├── app/routers/           auth, catalog + inventory streams, checkout, account, admin, webhooks
│   ├── app/services/          inventory (reservations), orders (state machine), payments (Stripe)
│   └── tests/                 pytest suite
├── packages/catalog/          build.mjs → catalog.json (products, factories, materials, journal)
├── infra/                     Prometheus, Grafana dashboards, Kubernetes manifests
├── docker-compose.yml         Full local stack
└── .github/workflows/ci.yml   CI
```

## 11. What's inside

### Storefront
- **Design system.** Warm neutrals with one earthy accent. Inter, with Instrument Serif used sparingly. 1px rules, a fixed 4→128 spacing scale, 150–500 ms animations, and `prefers-reduced-motion` respected everywhere.
- **Product images are drawn SVG flat-lays** with a fabric texture for each material. Every colour option renders exactly and each image is a few KB. Replace `GarmentArt` with photography when you have it.
- **Shop.** A category row plus one filter drawer (size, colour, material, price, fit, availability). The drawer becomes a bottom sheet on mobile, and filters are kept in the URL.
- **Product page.**
  - Swipeable gallery on mobile, and live stock for each size.
  - Sticky add-to-bag on mobile.
  - An animated *Why $48?* price breakdown, *Who made it?* and *What is it made from?*
  - The supply-chain map and a QR digital passport.
  - On mobile, the transparency sections collapse.
- **Search.** Plain-language queries: `black shirt under $60 for hot weather` → `color=black · category=shirt · price<$60 · weather=hot`.
- **Size finder.** Compares your measurements (or estimates them from height and weight) with each garment's measurements and intended fit. It returns a size, a confidence score, the reasons, and a body-vs-garment visual.
- **Bag and checkout.**
  - A free-shipping meter backed by a real $100 rule, with prices recalculated on the server.
  - Steps: Information → Shipping → Payment → Review → Confirmation.
  - Inline validation, and a 15-minute hold on your items.
- **Order tracking.** A timeline and route map (factory → New York → Nashville → you), updated live.
- **Account.** Overview, orders, wishlist, measurements, a passport for every garment you own, addresses, payment and preferences.

### API
- **Sign-in.** scrypt password hashing and server-side sessions stored hashed in httpOnly cookies. Also CSRF protection, customer/admin roles, and optional Google OAuth.
- **Inventory can't oversell.**
  - Every stock change is a single conditional `UPDATE`, backed by database CHECK constraints.
  - Checkout places a hold, payment confirms it, and a cancellation or an expired hold releases it.
  - Refunds put stock back.
  - A test with 12 simultaneous checkouts proves it.
- **Order state machine.** Only legal status changes are allowed, each one logged.
- **Payments.** Stripe PaymentIntents with signed, idempotent webhooks that verify the amount.
- **Real time.** Server-sent events for inventory, orders and the admin feed, with optional Redis fan-out.
- **Operations.**
  - JSON logs with request IDs.
  - Prometheus metrics: HTTP metrics plus orders, revenue and stock-limited checkouts.
  - Optional OpenTelemetry tracing (set `OTEL_EXPORTER_OTLP_ENDPOINT`).
  - Rate limiting and security headers.

### Admin console (`/admin`)
- **Overview.**
  - Revenue, orders, conversion, inventory health and returns, each compared with the previous period.
  - Revenue and order charts with hover readouts, plus a table view.
  - Top products, category mix, fulfilment pipeline and a live activity feed.
- **Operations pages.** Orders (move through the state machine), inventory (instant stock edits), products, customers, shipping, returns, factories, materials and production batches.

## 12. Not built yet

Listed explicitly so nothing here is mistaken for a working feature:

- **Kafka, OpenSearch, Terraform/AWS.** Not implemented. Search runs in the browser over the 16-product catalog, and events use server-sent events plus optional Redis.
- **Mapbox / Three.js.** Maps use `d3-geo` with bundled coastlines, so no API token is needed. There's no 3D.
- **Saved payment methods.** Stripe customers aren't attached yet, and the account page says so.
- **Database migrations.** Tables are created on startup. Add Alembic before changing the schema in production.
- **Email.** Order confirmations aren't sent.
- **Photography and CDN.** Images are generated SVG, and there's no object-storage integration.
