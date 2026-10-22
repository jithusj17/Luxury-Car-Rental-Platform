import type { BookingStatus } from "@car-rental/contracts";
import { and, eq, sql } from "drizzle-orm";
import { isPgError, PgErrorCode } from "../../../shared/db/pg-errors.ts";
import type { TransactionManager } from "../../../shared/db/transaction.ts";
import type { CalendarRepository } from "../application/ports.ts";
import type { Period } from "../domain/calendar-dates.ts";
import { ReservationConflictError } from "../domain/errors.ts";
import { bookings, vehicleReservations } from "./schema.ts";

const OVERLAP_CONSTRAINT = "vehicle_reservations_no_overlap";

/** Translates the exclusion-constraint violation into the domain's conflict error. */
async function guardOverlap<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (isPgError(error, PgErrorCode.exclusionViolation, OVERLAP_CONSTRAINT)) throw new ReservationConflictError();
    throw error;
  }
}

const range = (p: Period) => sql`daterange(${p.start}::date, ${p.end}::date)`;

/** Active entries that really block: owner blocks, confirmed bookings, and holds still within their window. */
const blocksNow = (now: Date) => sql`(
  ${vehicleReservations.kind} = 'OWNER_BLOCK'
  or ${bookings.status} = 'CONFIRMED'
  or (${bookings.status} = 'PENDING_PAYMENT' and ${bookings.holdExpiresAt} > ${now})
)`;

export function createCalendarRepository(tx: TransactionManager): CalendarRepository {
  const db = () => tx.executor();

  return {
    async lockVehicleCalendar(vehicleId) {
      if (!tx.inTransaction) throw new Error("lockVehicleCalendar must run inside a transaction");
      await db().execute(sql`select pg_advisory_xact_lock(hashtextextended(${`vehicle-calendar:${vehicleId}`}, 0))`);
    },

    async addBookingEntry({ bookingId, vehicleId, period, createdBy }) {
      await guardOverlap(() =>
        db().insert(vehicleReservations).values({ id: bookingId, bookingId, vehicleId, period, kind: "BOOKING", createdBy }),
      );
    },

    async setBookingEntryActive(bookingId, active) {
      // Savepoint: a failed re-activation must not abort the caller's transaction.
      await guardOverlap(() =>
        tx.run(() => db().update(vehicleReservations).set({ active }).where(eq(vehicleReservations.bookingId, bookingId))),
      );
    },

    async addBlock({ id, vehicleId, period, note, createdBy }) {
      await guardOverlap(() => db().insert(vehicleReservations).values({ id, vehicleId, period, note, createdBy, kind: "OWNER_BLOCK" }));
    },

    async findBlock(id) {
      const [row] = await db()
        .select({ id: vehicleReservations.id, vehicleId: vehicleReservations.vehicleId, period: vehicleReservations.period, note: vehicleReservations.note })
        .from(vehicleReservations)
        .where(and(eq(vehicleReservations.id, id), eq(vehicleReservations.kind, "OWNER_BLOCK")));
      return row ?? null;
    },

    async deleteBlock(id) {
      await db().delete(vehicleReservations).where(and(eq(vehicleReservations.id, id), eq(vehicleReservations.kind, "OWNER_BLOCK")));
    },

    async listBlockingEntries(vehicleId, period, now) {
      const rows = await db()
        .select({
          id: vehicleReservations.id,
          kind: vehicleReservations.kind,
          period: vehicleReservations.period,
          bookingId: vehicleReservations.bookingId,
          note: vehicleReservations.note,
          bookingStatus: bookings.status,
          renterId: bookings.renterId,
        })
        .from(vehicleReservations)
        .leftJoin(bookings, eq(bookings.id, vehicleReservations.bookingId))
        .where(
          and(
            eq(vehicleReservations.vehicleId, vehicleId),
            eq(vehicleReservations.active, true),
            sql`${vehicleReservations.period} && ${range(period)}`,
            blocksNow(now),
          ),
        )
        .orderBy(sql`lower(${vehicleReservations.period})`);
      return rows.map((r) => ({
        ...r,
        kind: r.kind as "BOOKING" | "OWNER_BLOCK",
        bookingStatus: r.bookingStatus as BookingStatus | null,
      }));
    },

    async vehicleIdsBlockedDuring(period, now) {
      const rows = await db()
        .selectDistinct({ vehicleId: vehicleReservations.vehicleId })
        .from(vehicleReservations)
        .leftJoin(bookings, eq(bookings.id, vehicleReservations.bookingId))
        .where(and(eq(vehicleReservations.active, true), sql`${vehicleReservations.period} && ${range(period)}`, blocksNow(now)));
      return rows.map((r) => r.vehicleId);
    },
  };
}
