# Car Rental

Peer-to-peer car rental: renters search and book cars; hosts list vehicles, manage availability, and track earnings. The UI follows the AutoDeal Figma template (see `CLAUDE.md` for the design source and engineering rules).

| Package | What it is |
|---|---|
| `apps/web` | Next.js 16 (App Router, Cache Components), React 19, Tailwind 4, Radix, TanStack Query, React Hook Form |
| `apps/api` | Fastify 5 modular monolith (identity, vehicles, bookings, payments, notifications), Drizzle ORM, PostgreSQL 17 |
| `packages/contracts` | Zod request/response schemas shared by both apps (validation, OpenAPI, TypeScript types) |

## Quick start

Requirements: Node 24+, pnpm 12, Docker.

```bash
pnpm install
docker compose up -d                 # Postgres :5433, Redis :6380
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
pnpm db:migrate
pnpm db:seed                         # owner@example.com / renter@example.com, password1234
pnpm dev                             # API :4000, web :3000
```

- App: http://localhost:3000 · API docs (OpenAPI UI): http://localhost:4000/docs
- Password-reset and booking emails are written to the API log in development.
- Payments use the built-in **mock provider**. Test cards: `4242424242424242` succeeds, `4000000000000002` is declined, `4000000000009995` has insufficient funds, `4000000000000259` succeeds without sending a webhook (exercises reconciliation).

## Quality gates

```bash
pnpm typecheck      # all packages
pnpm lint           # ESLint (web, incl. module-boundary rules) + tsc (api, contracts)
pnpm test           # web unit/component tests + API unit/integration tests (needs docker compose)
pnpm e2e            # production build + Playwright journeys (uses a disposable carrental_e2e database)
pnpm load-test      # against an API on :4100 with RATE_LIMIT_ENABLED=false (see script header)
```

On memory-constrained machines, cap Next.js build workers with `NEXT_BUILD_CPUS=4 pnpm build`.

API tests run against real Postgres (a fresh `carrental_test` database per run), including the booking concurrency suite.

## Documentation

- [docs/architecture.md](docs/architecture.md) — module boundaries, booking integrity, payments workflow, security model
- [docs/operations.md](docs/operations.md) — configuration, deployment, health checks, metrics and alerts, runbooks
- [docs/known-gaps.md](docs/known-gaps.md) — what is intentionally not built yet
