# Architecture

## Shape

A **modular monolith**: one API deployable, one web deployable, one Postgres database. Modules have explicit boundaries so any of them can be extracted into a service later without untangling code (see "Extraction path").

```
apps/web  ──/api rewrite (same origin, httpOnly cookie)──▶  apps/api  ──▶  PostgreSQL
                                                              │
                                                              └──▶ Redis (rate limits, production)
```

## Backend modules (`apps/api/src/modules`)

Each module is split into `domain` (pure rules, no I/O), `application` (use cases + port interfaces), `infrastructure` (Drizzle repositories, provider adapters, outbox handlers) and `presentation` (Fastify routes, presenters).

| Module | Owns tables | Responsibilities |
|---|---|---|
| identity | `users`, `sessions`, `password_reset_tokens` | Registration, login, sessions, password reset, roles (`renter`, `owner`) |
| vehicles | `vehicles` | Owner fleet management (optimistic concurrency via `version`), public catalog search |
| bookings | `bookings`, `vehicle_reservations` | Quotes, holds, the vehicle calendar, cancellation policy, owner blocks, earnings |
| payments | `payments`, `refunds`, `payment_webhook_events` (+ mock provider tables) | Payment attempts, webhooks, refunds, reconciliation |
| notifications | — | Email templates and delivery (via the outbox) |
| admin | `admin_audit_log` | Back office: platform overview, user roles and suspension, listing and booking moderation, payments view, audit trail |

Rules:
- A module never queries another module's tables. Cross-module needs go through **ports** (e.g. bookings uses `VehicleCatalog`, payments uses `BookingGateway`), wired in `src/container.ts` — the only composition root.
- Cross-module **transactions** use `TransactionManager` (AsyncLocalStorage): repositories join the caller's transaction automatically; nested calls become SAVEPOINTs.
- Side effects (emails, refunds, provider cancellations, mock webhook delivery) are written to `outbox_jobs` **in the same transaction** as the state change, then executed at-least-once by the worker (`FOR UPDATE SKIP LOCKED`, exponential backoff, permanent-failure metric). Every handler is idempotent.

## Booking integrity

**Invariant:** a vehicle never has two overlapping active calendar entries.

- Rental periods are half-open `[pickupDate, returnDate)` calendar days in the **vehicle's timezone**. Back-to-back rentals don't overlap; the return day is free for the next renter.
- Every blocking entry (payment hold, confirmed booking, owner block) is a row in `vehicle_reservations`. The database enforces the invariant:

  ```sql
  EXCLUDE USING gist (vehicle_id WITH =, period WITH &&) WHERE (active)
  ```

  A concurrent conflicting insert waits for the other transaction and then fails with `23P01`, mapped to `409 BOOKING_CONFLICT`. No "check then insert" logic is trusted.
- Statuses: `PENDING_PAYMENT` (15-minute hold) → `CONFIRMED` | `CANCELLED` | `EXPIRED`; `EXPIRED → CONFIRMED` only for a late payment when the dates are still free. Blocking statuses: `PENDING_PAYMENT`, `CONFIRMED`.
- **Contention:** every calendar write (booking, owner block, reviving a lapsed hold) first takes a per-vehicle advisory lock (`pg_advisory_xact_lock`). Without it, many simultaneous overlapping inserts can deadlock inside Postgres (the constraint still holds, but losers wait seconds and fail). With it, conflicting requests queue per vehicle and fail fast with 409; other vehicles are unaffected. Lock order is always *vehicle calendar → booking row*, and booking transactions never lock payment rows (open-payment cancellation is deferred to the outbox), so the payment webhook path (*payment → calendar → booking*) can't form a cycle. Any remaining deadlock or serialization failure is returned as a retryable 503.
- Lapsed holds are reclaimed **inside** the next booking/block transaction for the same dates (and by a 30-second sweeper), so availability never waits for a background job.
- **Idempotency:** `POST /v1/bookings` requires `Idempotency-Key`. `(renter_id, idempotency_key)` is unique; a replay returns the original booking (200), a different payload with the same key returns 422, concurrent duplicates resolve to the single winner.
- Price is computed on the server (daily rate × days + 10% service fee) and snapshotted on the booking.

Proven by `apps/api/test/booking-concurrency.test.ts` (12 overlapping concurrent requests → exactly one 201; duplicates; expiry takeover; mid-transaction failure rollback; DB down → 503) and by the load test (100 concurrent renters, same slot → exactly one success).

## Payments workflow

```
renter ─POST /bookings/:id/payments─▶ payment REQUIRES_ACTION (one open-or-succeeded per booking: partial unique index)
       ─card step at provider────────▶ provider ─signed webhook─▶ inbox (unique event id) ─▶ apply status
                                                                                       └─▶ booking CONFIRMED (same transaction)
```

- Webhooks are HMAC-signed (`t=…,v1=…`, 5-minute tolerance) and de-duplicated by `(provider, event_id)`; processing happens in the same transaction as recording the event, so a failed processing attempt is retried by the provider.
- Out-of-order events are harmless: only valid transitions apply (`SUCCEEDED` is terminal; a provider-reported capture wins over a local failure/cancel).
- **Failure:** the payment becomes `FAILED`; the booking keeps its hold until it lapses so the renter can retry with another card. Retrying re-checks the provider first, so an attempt whose webhook is still in flight is never reused.
- **Late success** (hold expired or booking cancelled): the hold is revived if the dates are still free; otherwise a full refund is queued automatically (`payment_late_refunds_total` metric).
- **Lost/delayed webhooks:** a reconciliation job re-reads payments open for >10 minutes from the provider and applies the authoritative status; open payments for released holds are cancelled at the provider.
- **Refunds** reserve their amount in a `refunds` row with a deterministic idempotency key (e.g. `cancel:<bookingId>`), guarded by `CHECK (refunded_cents <= amount_cents)`; the provider call is retried by the outbox with the same key.
- Cancellation policy: renter ≥48h before pickup → 100%, until pickup → 50%, after → not cancellable; host/admin until the return day → 100%.

The mock provider implements the same `PaymentProvider` port a real provider (e.g. Stripe) would; startup refuses `PAYMENT_PROVIDER=mock` in production.

## Admin area

`/v1/admin/*` (API) and `/admin` (web). Every route requires the `admin` role, checked on the server. Admin changes go through the owning module's use cases, so the normal rules apply (vehicle status transitions; admin cancellations refund in full under the cancellation policy). Each change is written to `admin_audit_log` in the same transaction. Guard rails: admins can't remove their own admin role or suspend themselves, and can only cancel bookings they aren't party to through the audited admin endpoint (a reason is required). Suspended users can't sign in and their existing sessions stop working immediately.

## Security model

- Passwords: scrypt (N=2^14, r=8, p=5 — OWASP-equivalent to N=2^17/p=1 at ~16 MiB instead of 128 MiB per hash), per-user salt, constant-time compare, timing-equalised login for unknown emails.
- Email verification: sign-up emails a single-use link (SHA-256 stored, 24-hour expiry); the link opens a page where the user clicks to confirm, so mail scanners that prefetch links can't verify an address.
- Admins: `ADMIN_EMAILS` grants the admin role only to accounts with a verified email, at startup and at the moment a listed account verifies; each grant is written to the audit log. Sign-up never grants roles from the request body.
- Sessions: 256-bit random token in an `httpOnly; SameSite=Lax; Secure` (production) cookie; only its SHA-256 is stored; sliding 14-day expiry; rotated on login; all sessions revoked on password reset, other sessions on password change.
- CSRF: the browser reaches the API same-origin through the Next.js rewrite; every non-GET request must carry an allow-listed `Origin` (webhooks exempt, signature-verified).
- Authorization is enforced in use cases: ownership checks return 404 to non-parties; owner endpoints require the `owner` role.
- Validation: Zod on body, params, query and headers; unknown fields are stripped (no mass assignment); responses are serialized through their schema (no accidental field leaks); 1 MB body limit (64 KB for webhooks).
- Rate limits (per IP and per account/user, `429` + `Retry-After`): login, registration, password reset, search, quotes, booking create/cancel, payment start. Redis-backed when `REDIS_URL` is set. Abuse-sensitive routes fail closed if Redis is down; read routes fail open.
- Headers: Helmet on the API; `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` on the web app. Logs redact cookies, authorization, passwords, tokens and card data.

## Frontend structure (`apps/web/src`)

```
app/       routes only (thin): (public), (auth), dashboard
shell/     layouts, navigation, providers (QueryClient, toasts)
domains/   auth · vehicles · bookings · payments · owner — each with api.ts, hooks.ts, components/
shared/    design system (components/ui), api client, hooks, lib
```

ESLint enforces the boundaries (`shared` imports nothing app-specific; `domains` never import `shell`/`app`). Public catalog pages render on the server (streamed behind Suspense under Cache Components); authenticated areas are client components backed by TanStack Query through the `/api` rewrite. `proxy.ts` does an optimistic cookie check for `/dashboard` and `/checkout`; the API remains the authority.

## Extraction path

Not needed today (one team, one deployment). When it is: notifications first (already asynchronous via the outbox), then payments (PCI scope). Replace the in-process port adapters in `container.ts` with HTTP/queue clients; table ownership is already per module.
