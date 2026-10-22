import type { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";
import { buildApp } from "../../src/app.ts";
import type { Container } from "../../src/container.ts";
import { fixedClock } from "../../src/shared/clock.ts";
import { loadEnv } from "../../src/shared/config/env.ts";
import { createScryptHasher } from "../../src/modules/identity/infrastructure/scrypt-password-hasher.ts";
import type { RenderedEmail } from "../../src/modules/notifications/application/templates.ts";

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5433/carrental_test";
export const ORIGIN = "http://localhost:3000";
/** A fixed "now" far enough ahead that test dates never fall in the real past. */
export const TEST_NOW = "2030-01-10T09:00:00.000Z";

export type TestApp = Awaited<ReturnType<typeof createTestApp>>;

export async function createTestApp(options: { env?: Record<string, string>; now?: string } = {}) {
  const env = loadEnv({
    NODE_ENV: "test",
    LOG_LEVEL: "silent",
    DATABASE_URL: TEST_DATABASE_URL,
    DATABASE_POOL_MAX: "25",
    PAYMENT_WEBHOOK_SECRET: "test-webhook-secret-0123456789",
    RATE_LIMIT_ENABLED: "false",
    JOBS_ENABLED: "false",
    WEB_ORIGINS: ORIGIN,
    ...options.env,
  });
  const clock = fixedClock(options.now ?? TEST_NOW);
  const sent: RenderedEmail[] = [];
  let self: FastifyInstance | undefined;

  const { app, container } = await buildApp(env, {
    clock,
    hasher: createScryptHasher({ N: 2 ** 10 }), // fast hashing in tests
    emailSender: { send: async (email) => void sent.push(email) },
    // The mock provider's webhooks are delivered in-process instead of over HTTP.
    webhookDelivery: async (body, headers) => {
      const response = await self!.inject({ method: "POST", url: "/v1/payments/webhooks/mock", payload: body, headers });
      if (response.statusCode >= 300) throw new Error(`Webhook rejected: ${response.statusCode} ${response.body}`);
    },
  });
  self = app;
  await app.ready();
  return { app, container, clock, emails: sent };
}

const TABLES = [
  "admin_audit_log",
  "outbox_jobs",
  "payment_webhook_events",
  "refunds",
  "payments",
  "mock_provider_refunds",
  "mock_provider_payments",
  "vehicle_reservations",
  "bookings",
  "vehicles",
  "password_reset_tokens",
  "email_verification_tokens",
  "sessions",
  "users",
];

export async function resetDatabase(container: Container): Promise<void> {
  await container.database.db.execute(sql.raw(`truncate ${TABLES.join(", ")} cascade`));
}

/** Runs queued side effects (emails, webhook deliveries, refunds) until the outbox is empty. */
export async function drainOutbox(container: Container, rounds = 5): Promise<void> {
  for (let i = 0; i < rounds; i += 1) {
    if ((await container.outbox.drain(100)) === 0) return;
  }
}
