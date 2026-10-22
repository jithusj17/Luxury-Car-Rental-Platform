# Deployment

The app ships as two Docker images (API and web) plus a production compose file that runs them behind **Caddy** with automatic HTTPS. Everything below is in [`deploy/`](../deploy).

```text
Internet ──443──▶ Caddy ──/api/*──▶ api  (Fastify, port 4000) ──▶ PostgreSQL, Redis
                         └─ /*  ───▶ web  (Next.js, port 3000) ──server-side──▶ api
External services: Stripe (payments), SMTP provider (email), S3-compatible bucket (photos)
```

## 1. Accounts you need

| Service | What to create | Settings it gives you |
|---|---|---|
| A server | Any Linux VPS with Docker (2 GB RAM or more), ports 80 and 443 open | — |
| A domain | DNS `A` record pointing to the server | `DOMAIN`, `PUBLIC_URL` |
| [Stripe](https://dashboard.stripe.com) | API keys; a webhook endpoint at `https://<domain>/api/v1/payments/webhooks/stripe` with events `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled` | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` |
| Email (Resend, SendGrid, Amazon SES, Postmark…) | SMTP credentials and a verified sender domain | `SMTP_URL`, `EMAIL_FROM` |
| Photo storage (Cloudflare R2, AWS S3…) | A bucket with public read access (or a public custom domain/CDN) and an access key with write access | `S3_*`, `STORAGE_PUBLIC_URL`, `IMAGE_REMOTE_PATTERNS` |

## 2. Configure

On the server, clone the repository and create the settings file:

```bash
git clone https://github.com/jithusj17/Luxury-Car-Rental-Platform.git
cd Luxury-Car-Rental-Platform
cp deploy/.env.production.example deploy/.env
nano deploy/.env          # fill in every value; generate secrets with: openssl rand -hex 32
```

The API refuses to start if anything required for production is missing (real email, Stripe, S3 storage, metrics token), with a message naming the setting.

## 3. Start

```bash
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env up -d --build
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env ps
```

Start order is automatic: PostgreSQL and Redis → `migrate` (applies database migrations, then exits) → API → web → Caddy. The first start obtains the HTTPS certificate.

Check it:

```bash
curl -s https://<domain>/api/health/ready      # {"status":"ok","checks":{"database":"ok","redis":"ok"}}
```

**Admins** come from the `ADMIN_EMAILS` setting in `deploy/.env` (comma-separated). Register with one of those emails and open the verification link that is emailed to you: the account becomes an admin at that moment, and the change is recorded in the audit log. Verification matters here: without it, anyone could register a listed address first. Existing admins can also grant or remove admin access from **Admin → Users**. Removing an email from `ADMIN_EMAILS` doesn't demote anyone; use the Users page for that.

## 4. Update to a new version

```bash
git pull
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env up -d --build
```

Migrations run automatically before the new API starts. The web image bakes in `IMAGE_REMOTE_PATTERNS` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` at build time, so rebuild after changing them.

## 5. Operate

- **Backups:** `docker compose ... exec postgres pg_dump -U carrental carrental | gzip > backup-$(date +%F).sql.gz` — schedule it daily (cron) and copy off the server. Test a restore regularly.
- **Logs:** `docker compose ... logs -f api` (structured JSON; tokens, passwords and card data are redacted).
- **Metrics:** `https://<domain>/api/metrics` with `Authorization: Bearer $METRICS_TOKEN` (Prometheus format). Alert rules: [operations.md](operations.md).
- **Scaling:** the API is stateless (sessions in PostgreSQL, rate limits in Redis, photos in S3), so more API instances can run behind the proxy; background jobs are safe to run on all of them.

## Rehearse locally

`bash deploy/smoke-test.sh` starts the same production stack on http://localhost:8080 with stand-ins (Mailpit for email, SeaweedFS for S3, stripe-mock for Stripe), checks pages, API health, security headers and sign-up, then tears it down. CI runs this on every push.

## Managed platforms

The same two images run on container platforms (Render, Railway, Fly.io, AWS ECS, Google Cloud Run): run `node src/shared/db/migrate.ts` from the API image as a release/pre-deploy command, use managed PostgreSQL and Redis, and set the same environment variables. Route `/api/*` to the API (stripping the prefix) or give the API its own domain and set `PUBLIC_API_URL`, `WEB_ORIGINS` and the web build arg `API_INTERNAL_URL` accordingly.
