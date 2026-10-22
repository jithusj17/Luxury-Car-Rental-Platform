import { sql } from "drizzle-orm";
import { check, index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Transactional outbox: side effects (emails, refunds, webhook deliveries) are recorded in the
 * same transaction as the state change that causes them, then executed at-least-once by a worker.
 */
export const outboxJobs = pgTable(
  "outbox_jobs",
  {
    id: uuid("id").primaryKey(),
    type: text("type").notNull(),
    payload: jsonb("payload").notNull(),
    status: text("status").notNull().default("PENDING"),
    attempts: integer("attempts").notNull().default(0),
    runAt: timestamp("run_at", { withTimezone: true }).notNull().defaultNow(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    check("outbox_jobs_status_check", sql`${t.status} in ('PENDING', 'RUNNING', 'DONE', 'FAILED')`),
    index("outbox_jobs_due_idx").on(t.runAt).where(sql`${t.status} = 'PENDING'`),
  ],
);
