import { char, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * State of the built-in mock payment provider. It stands in for a real provider's
 * servers, so the payments module only ever talks to it through the `PaymentProvider` port.
 */
export const mockProviderPayments = pgTable("mock_provider_payments", {
  id: text("id").primaryKey(),
  amountCents: integer("amount_cents").notNull(),
  currency: char("currency", { length: 3 }).notNull(),
  status: text("status").notNull(),
  clientSecret: text("client_secret").notNull().unique(),
  reference: text("reference").notNull().unique(),
  refundedCents: integer("refunded_cents").notNull().default(0),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const mockProviderRefunds = pgTable("mock_provider_refunds", {
  id: text("id").primaryKey(),
  paymentId: text("payment_id")
    .notNull()
    .references(() => mockProviderPayments.id),
  amountCents: integer("amount_cents").notNull(),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
