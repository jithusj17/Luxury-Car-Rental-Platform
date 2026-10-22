# Backend API — `apps/api`

The Fastify 5 API of the [Luxury Car Rental Platform](../../README.md), backed by PostgreSQL 17. It runs on **http://localhost:4000**, with interactive API documentation at **http://localhost:4000/docs**.

> Setup and the full project structure are in the [root README](../../README.md). Install and run commands from the **repository root**, not from this folder.

## Layout

```text
apps/api/
├── src/
│   ├── modules/          # One folder per business area
│   │   ├── identity/     # Accounts, login, sessions, password reset
│   │   ├── vehicles/     # Host fleet management and catalog search
│   │   ├── bookings/     # Holds, calendar, cancellations, host blocks, earnings
│   │   ├── payments/     # Payment provider, webhooks, refunds (includes the test provider)
│   │   └── notifications/# Email templates
│   ├── shared/           # Config, database, HTTP security, rate limits, background jobs, logging
│   ├── scripts/          # seed.ts, reset-db.ts, load-test.ts
│   ├── app.ts            # Fastify app setup
│   ├── container.ts      # Connects the modules
│   └── main.ts           # Server entry point
├── migrations/           # SQL migrations
├── test/                 # Integration and booking-concurrency tests (real PostgreSQL)
└── .env.example          # All settings, with comments
```

Modules are split into `domain/` (business rules), `application/` (use cases), `infrastructure/` (database and external services) and `presentation/` (HTTP routes). `notifications/` has no routes or domain rules, so it only has `application/` and `infrastructure/`.

## Commands (from the repository root)

```bash
pnpm --filter api dev          # development server with reload
pnpm --filter api db:migrate   # apply migrations
pnpm --filter api db:seed      # demo data
pnpm --filter api test         # tests (needs `docker compose up -d`)
```
