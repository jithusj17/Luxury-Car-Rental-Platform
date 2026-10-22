import type { Clock } from "../../../shared/clock.ts";
import type { TransactionManager } from "../../../shared/db/transaction.ts";
import type { BookingDeps } from "../../bookings/application/ports.ts";
import type { SessionRepository, UserRepository } from "../../identity/application/ports.ts";
import type { PaymentRepository } from "../../payments/application/ports.ts";
import type { VehicleDeps } from "../../vehicles/application/ports.ts";

export type AuditRecord = {
  id: string;
  actorId: string;
  action: string;
  targetType: "user" | "vehicle" | "booking";
  targetId: string;
  details: Record<string, unknown>;
  createdAt: Date;
};

export interface AuditLog {
  record(entry: Omit<AuditRecord, "id" | "createdAt">): Promise<void>;
  list(page: { page: number; pageSize: number }): Promise<{ items: AuditRecord[]; total: number }>;
}

/**
 * The admin area is a back-office module: it reads each module through that module's own
 * repository methods and performs changes through the owning module's use cases, so business
 * rules (cancellation refunds, vehicle status transitions) are never duplicated here.
 */
export type AdminDeps = {
  users: Pick<UserRepository, "findById" | "findByEmailWithPassword" | "findNames" | "listForAdmin" | "countSummary" | "setRoles" | "setSuspended">;
  sessions: Pick<SessionRepository, "deleteAllForUser">;
  payments: Pick<PaymentRepository, "listForAdmin" | "refundedTotalCents">;
  vehicles: VehicleDeps;
  bookings: BookingDeps;
  audit: AuditLog;
  tx: TransactionManager;
  clock: Clock;
};
