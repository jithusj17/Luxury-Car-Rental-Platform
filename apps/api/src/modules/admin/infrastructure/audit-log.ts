import { randomUUID } from "node:crypto";
import { count, desc } from "drizzle-orm";
import type { TransactionManager } from "../../../shared/db/transaction.ts";
import type { AuditLog, AuditRecord } from "../application/ports.ts";
import { adminAuditLog } from "./schema.ts";

/** Joins the caller's transaction, so an audit entry exists only if the audited change committed. */
export function createAuditLog(tx: TransactionManager): AuditLog {
  const db = () => tx.executor();
  return {
    async record(entry) {
      await db().insert(adminAuditLog).values({ id: randomUUID(), ...entry });
    },
    async list({ page, pageSize }) {
      const [rows, totals] = await Promise.all([
        db().select().from(adminAuditLog).orderBy(desc(adminAuditLog.createdAt)).limit(pageSize).offset((page - 1) * pageSize),
        db().select({ total: count() }).from(adminAuditLog),
      ]);
      return {
        items: rows.map((r) => ({ ...r, targetType: r.targetType as AuditRecord["targetType"], details: r.details as Record<string, unknown> })),
        total: totals[0]?.total ?? 0,
      };
    },
  };
}
