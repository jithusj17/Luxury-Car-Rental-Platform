# Operations

## Configuration

API configuration is validated at startup (`apps/api/src/shared/config/env.ts`); the process refuses to start on invalid values. See `apps/api/.env.example`. Production additionally requires `METRICS_TOKEN` and a real `PAYMENT_PROVIDER`; set `REDIS_URL` when running more than one instance (rate limits are otherwise per instance — a warning is logged).

Web: `API_INTERNAL_URL` (server-side address of the API, used by Server Components and the `/api` rewrite).

## Deployment order

1. `pnpm db:migrate` (SQL migrations in `apps/api/migrations`, applied once, before new instances start).
2. Start API instances (`node src/main.ts`). Background jobs run in every instance; they are safe to run concurrently (row locks / conditional updates). Set `JOBS_ENABLED=false` on instances that should only serve HTTP.
3. Start the web app (`next start`) behind HTTPS. Set `TRUST_PROXY` on the API to match the proxy chain so client IPs (rate limits, logs) are correct.

Graceful shutdown: on SIGTERM the API stops accepting connections, drains in-flight requests and jobs, then closes the pool (forced exit after 15 s).

## Health and metrics

| Endpoint | Purpose |
|---|---|
| `GET /health/live` | Process is up (liveness) |
| `GET /health/ready` | Database (and Redis, if configured) reachable within 2 s — 503 otherwise (readiness) |
| `GET /metrics` | Prometheus metrics (`Authorization: Bearer $METRICS_TOKEN` in production) |

Every response carries `x-request-id` (an incoming well-formed id is propagated); logs are structured JSON with that id.

## Alerts

| Alert | Condition | Meaning / action |
|---|---|---|
| Booking conflicts spike | `rate(booking_conflicts_total[5m])` well above baseline | Expected occasionally (two renters, same car). A spike may mean stale availability in the UI or a bot. |
| Late-payment refunds | `increase(payment_late_refunds_total[1h]) > 0` | A renter paid after losing the slot and was refunded automatically. Check hold duration vs. provider latency. |
| Payment failures | `rate(payment_failures_total[15m])` by `reason` above baseline | Provider issues or fraud attempts. |
| Outbox job dead | `increase(outbox_jobs_failed_total[15m]) > 0` | A side effect (refund, email, provider cancel) exhausted 10 retries. See runbook. |
| API errors / latency | 5xx ratio > 1% or p95 `http_request_duration_seconds` > 1 s | Standard SLO alerts. |
| Not ready | `/health/ready` failing | Database or Redis unreachable. |

## Runbooks

**Outbox job failed permanently.** `select id, type, payload, last_error from outbox_jobs where status = 'FAILED'`. Fix the cause, then requeue: `update outbox_jobs set status = 'PENDING', attempts = 0, run_at = now() where id = '…'`. Handlers are idempotent (refunds use their stored idempotency key), so requeueing is safe.

**Renter says they paid but the booking isn't confirmed.** Check `payments` for the booking. If `REQUIRES_ACTION` for more than 10 minutes, the reconciliation job will query the provider; to force it, restart a job-enabled instance or wait for the next 2-minute tick. If the booking is `EXPIRED`/`CANCELLED` and the payment `SUCCEEDED`, a refund row should exist in `refunds`.

**Suspected double booking.** Impossible at the database level while `vehicle_reservations_no_overlap` exists: `select conname from pg_constraint where conname = 'vehicle_reservations_no_overlap'`. Never drop or disable it in a migration.

## Admin audit trail

Every admin action (role change, suspension, listing status change, booking cancellation) is recorded in `admin_audit_log` with the admin, target and details, and is visible at `/admin/audit-log`. The table is append-only; retain it as long as bookings and payments.

## Data retention

- `sessions`: expired rows purged hourly.
- `password_reset_tokens`: single-use, 1-hour expiry (rows kept for audit; safe to purge after 30 days).
- `outbox_jobs` (`DONE`) and `payment_webhook_events`: safe to purge after 30 days (webhook ids must outlive the provider's retry window, typically ≤ 3 days).
- Bookings, payments and refunds are financial records: retain per legal requirements; users are not hard-deleted while they have bookings (`ON DELETE RESTRICT`).
