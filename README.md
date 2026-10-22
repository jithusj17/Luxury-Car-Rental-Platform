# Luxury Car Rental Platform

[![CI](https://github.com/jithusj17/Luxury-Car-Rental-Platform/actions/workflows/ci.yml/badge.svg)](https://github.com/jithusj17/Luxury-Car-Rental-Platform/actions/workflows/ci.yml)

A full-stack car rental platform: renters search cars, book dates and pay; hosts list vehicles, manage availability and track earnings; admins moderate users, listings and bookings. Bookings can never overlap — the database enforces it.

- **Frontend:** Next.js 16 + React 19 + Tailwind CSS 4 → [`apps/web`](apps/web)
- **Backend API:** Node.js 24 + Fastify 5 + PostgreSQL 17 (Drizzle ORM) → [`apps/api`](apps/api)
- **Shared request/response schemas:** Zod → [`packages/contracts`](packages/contracts)

> **Where is the app?** This repository is a pnpm monorepo. The **repository root is the project root**: install and run everything from the top-level folder (the one containing `package.json` and `pnpm-workspace.yaml`). The frontend and backend are in `apps/web` and `apps/api`.

## Repository structure

```text
.
├── apps/
│   ├── web/                     # Frontend (Next.js) — http://localhost:3000
│   │   ├── src/
│   │   │   ├── app/             # Routes: (public), (auth), dashboard, admin
│   │   │   ├── domains/         # Features: auth, vehicles, bookings, payments, owner, admin
│   │   │   ├── shared/          # Design system (components/ui), API client, hooks, utils
│   │   │   ├── shell/           # Header, footer, dashboard shell, navigation, providers
│   │   │   └── proxy.ts         # Redirects signed-out visitors away from /dashboard and /checkout
│   │   ├── e2e/                 # Playwright end-to-end tests
│   │   ├── next.config.ts
│   │   └── .env.example
│   └── api/                     # Backend API (Fastify) — http://localhost:4000
│       ├── src/
│       │   ├── modules/         # identity, vehicles, bookings, payments, notifications, admin
│       │   ├── shared/          # config, db, http, outbox, jobs, logging, errors
│       │   ├── scripts/         # seed, reset-db, load-test
│       │   ├── app.ts           # Fastify app setup
│       │   ├── container.ts     # Wires modules together
│       │   └── main.ts          # Server entry point
│       ├── migrations/          # SQL migrations (Drizzle)
│       ├── test/                # Integration and concurrency tests
│       └── .env.example
├── packages/
│   └── contracts/               # Zod schemas shared by web and api
├── .github/workflows/ci.yml     # CI: typecheck, lint, tests, build, end-to-end tests
├── docs/                        # Architecture, operations, known gaps
├── deploy/                      # Production: docker-compose.prod.yml, Caddyfile, env example, smoke test
├── docker-compose.yml           # Local services: PostgreSQL, Redis, Mailpit (+ optional S3 and stripe-mock)
├── package.json                 # Workspace scripts (run from the repository root)
├── pnpm-workspace.yaml
└── CLAUDE.md                    # Engineering guidelines for the project
```

### Where to find things

| Looking for… | Path |
|---|---|
| Home page | `apps/web/src/app/(public)/page.tsx` |
| Car search and car detail pages | `apps/web/src/app/(public)/cars/` |
| Checkout | `apps/web/src/app/(public)/checkout/[bookingId]/page.tsx` |
| Login / register pages | `apps/web/src/app/(auth)/` |
| Renter and host dashboard pages | `apps/web/src/app/dashboard/` |
| Admin pages | `apps/web/src/app/admin/` |
| Reusable UI components | `apps/web/src/shared/components/ui/` |
| Design tokens (colors, fonts, radii) | `apps/web/src/app/globals.css` |
| API endpoints (routes) | `apps/api/src/modules/*/presentation/` |
| Business rules | `apps/api/src/modules/*/domain/` and `apps/api/src/modules/*/application/` |
| Database tables | `apps/api/src/modules/*/infrastructure/schema.ts` and `apps/api/migrations/` |
| Double-booking protection | `apps/api/migrations/0001_booking_integrity.sql` |
| API configuration options | `apps/api/src/shared/config/env.ts` and `apps/api/.env.example` |

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org) **24 or newer**
- [pnpm](https://pnpm.io) **12** (`corepack enable` installs the version pinned in `package.json`)
- [Docker](https://www.docker.com) (runs PostgreSQL and Redis)

### Install and run

Run these from the **repository root**:

```bash
git clone https://github.com/jithusj17/Luxury-Car-Rental-Platform.git
cd Luxury-Car-Rental-Platform

pnpm install                                   # installs web, api and contracts together
docker compose up -d                           # PostgreSQL :5433, Redis :6380, Mailpit (email inbox) :8025

cp apps/api/.env.example apps/api/.env         # API settings
cp apps/web/.env.example apps/web/.env.local   # web settings

pnpm db:migrate                                # create the database tables
pnpm db:seed                                   # demo accounts and 12 sample cars
pnpm dev                                       # starts the API and the web app
```

Then open:

- **App:** http://localhost:3000
- **API documentation (OpenAPI):** http://localhost:4000/docs

**Demo accounts** (created by `pnpm db:seed`, password `password1234`):

| Role | Email |
|---|---|
| Host (can list cars) | `owner@example.com` |
| Renter | `renter@example.com` |
| Admin | `admin@example.com` |

Where to go after signing in:

| Role | Pages |
|---|---|
| Renter | `/dashboard` (overview), `/dashboard/bookings`, `/dashboard/profile` |
| Host | `/dashboard/fleet`, `/dashboard/fleet/new`, `/dashboard/availability`, `/dashboard/requests`, `/dashboard/earnings` |
| Admin | `/admin` (overview), `/admin/users`, `/admin/vehicles`, `/admin/bookings`, `/admin/payments`, `/admin/audit-log` |

Payments use a built-in **test payment provider** — no real money. Test cards:

| Card number | Result |
|---|---|
| `4242424242424242` | Succeeds |
| `4000000000000002` | Declined |
| `4000000000009995` | Insufficient funds |
| `4000000000000259` | Succeeds without sending a webhook (tests reconciliation) |

In development, emails (booking confirmations, password-reset links) are delivered to the local Mailpit inbox at http://localhost:8025. Photos uploaded by hosts are stored in `apps/api/uploads`.

### Running one app on its own

From the repository root:

```bash
pnpm --filter api dev      # backend only  (apps/api, port 4000)
pnpm --filter web dev      # frontend only (apps/web, port 3000; needs the API running)
```

## Commands

All commands run from the repository root.

| Command | What it does |
|---|---|
| `pnpm dev` | Start the API and the web app in development mode |
| `pnpm build` | Production build of the web app |
| `pnpm typecheck` | Type-check all packages |
| `pnpm lint` | Lint all packages |
| `pnpm test` | Unit and integration tests (needs `docker compose up -d`) |
| `pnpm e2e` | Build the web app and run the Playwright browser tests |
| `pnpm db:migrate` | Apply database migrations |
| `pnpm db:seed` | Load demo accounts (renter, host, admin) and sample cars |
| `pnpm load-test` | Load test against an API on port 4100 (see `apps/api/src/scripts/load-test.ts`) |

Every push and pull request runs the same checks on GitHub Actions (`.github/workflows/ci.yml`).

On machines with little memory, limit the build workers: `NEXT_BUILD_CPUS=4 pnpm build`.

## Deploying to production

See [docs/deployment.md](docs/deployment.md): Docker images for the API and web app, a production compose file with automatic HTTPS (Caddy), Stripe, SMTP email and S3-compatible photo storage. `bash deploy/smoke-test.sh` rehearses the production stack locally.

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — modules, how double bookings are prevented, payments flow, security
- [`docs/deployment.md`](docs/deployment.md) — accounts you need, configuration, start, update, backups
- [`docs/operations.md`](docs/operations.md) — configuration, health checks, metrics, alerts, runbooks
- [`docs/known-gaps.md`](docs/known-gaps.md) — what isn't built yet
- [`apps/web/README.md`](apps/web/README.md) and [`apps/api/README.md`](apps/api/README.md) — app-specific notes
