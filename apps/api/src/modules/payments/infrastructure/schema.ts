import { sql } from "drizzle-orm";
import { char, check, index, integer, jsonb, pgTable, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { users } from "../../identity/infrastructure/schema.ts";
import { bookings } from "../../bookings/infrastructure/schema.ts";

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "restrict" }),
    renterId: uuid("renter_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    amountCents: integer("amount_cents").notNull(),
    refundedCents: integer("refunded_cents").notNull().default(0),
    currency: char("currency", { length: 3 }).notNull(),
    status: text("status").notNull(),
    provider: text("provider").notNull(),
    providerPaymentId: text("provider_payment_id").unique(),
    clientSecret: text("client_secret"),
    failureReason: text("failure_reason"),
    succeededAt: timestamp("succeeded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("payments_status_check", sql`${t.status} in ('REQUIRES_ACTION', 'SUCCEEDED', 'FAILED', 'CANCELLED')`),
    check("payments_refund_check", sql`${t.refundedCents} between 0 and ${t.amountCents}`),
    // At most one open or successful charge per booking: the database refuses a duplicate charge.
    uniqueIndex("payments_one_active_per_booking")
      .on(t.bookingId)
      .where(sql`${t.status} in ('REQUIRES_ACTION', 'SUCCEEDED')`),
    index("payments_open_idx").on(t.createdAt).where(sql`${t.status} = 'REQUIRES_ACTION'`),
  ],
);

export const refunds = pgTable(
  "refunds",
  {
    id: uuid("id").primaryKey(),
    paymentId: uuid("payment_id")
      .notNull()
      .references(() => payments.id, { onDelete: "restrict" }),
    amountCents: integer("amount_cents").notNull(),
    reason: text("reason").notNull(),
    /** Deterministic per business event, so retried refund jobs never refund twice. */
    idempotencyKey: text("idempotency_key").notNull().unique(),
    status: text("status").notNull(),
    providerRefundId: text("provider_refund_id").unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("refunds_status_check", sql`${t.status} in ('PENDING', 'SUCCEEDED', 'FAILED')`)],
);

/** Inbox of provider webhook events; the unique key makes processing idempotent. */
export const paymentWebhookEvents = pgTable(
  "payment_webhook_events",
  {
    id: uuid("id").primaryKey(),
    provider: text("provider").notNull(),
    eventId: text("event_id").notNull(),
    type: text("type").notNull(),
    payload: jsonb("payload").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("payment_webhook_events_provider_event").on(t.provider, t.eventId)],
);
