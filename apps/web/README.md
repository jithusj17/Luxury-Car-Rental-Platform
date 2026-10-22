# Frontend — `apps/web`

The Next.js 16 web app of the [Luxury Car Rental Platform](../../README.md). It runs on **http://localhost:3000** and talks to the API in [`apps/api`](../api) through the same-origin `/api` path (configured in `next.config.ts`).

> Setup and the full project structure are in the [root README](../../README.md). Install and run commands from the **repository root**, not from this folder.

## Layout

```text
apps/web/
├── src/
│   ├── app/          # Routes
│   │   ├── (public)/ # Home, /cars, /cars/[slug], /checkout/[bookingId], about, FAQ, contact, terms
│   │   ├── (auth)/   # /login, /register, /forgot-password, /reset-password
│   │   └── dashboard/# Renter pages (overview, bookings, profile) and host pages (fleet, availability, requests, earnings)
│   ├── domains/      # Feature code: auth, vehicles, bookings, payments, owner
│   ├── shared/       # UI components, API client, hooks, utilities
│   ├── shell/        # Header, footer, dashboard shell, navigation, providers
│   └── proxy.ts      # Sends signed-out visitors from /dashboard and /checkout to /login
├── e2e/              # Playwright end-to-end tests
├── next.config.ts
└── .env.example      # API_INTERNAL_URL
```

## Commands (from the repository root)

```bash
pnpm --filter web dev        # development server
pnpm --filter web build      # production build
pnpm --filter web test       # unit and component tests (Vitest)
pnpm --filter web e2e        # end-to-end tests (Playwright; build first)
```
