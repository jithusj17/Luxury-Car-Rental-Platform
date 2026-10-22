import type { BookingStatus, Currency } from "@car-rental/contracts";
import { and, asc, count, desc, eq, inArray, isNotNull, lte, or, sql, type SQL } from "drizzle-orm";
import { isPgError, PgErrorCode } from "../../../shared/db/pg-errors.ts";
import type { TransactionManager } from "../../../shared/db/transaction.ts";
import type { BookingListFilter, BookingRepository, NewBooking } from "../application/ports.ts";
import type { Booking } from "../domain/booking.ts";
import { DuplicateIdempotencyKeyError } from "../domain/errors.ts";
import { bookings, vehicleReservations } from "./schema.ts";

type Row = typeof bookings.$inferSelect;

function toBooking(row: Row): Booking {
  const { dailyRateCents, subtotalCents, serviceFeeCents, totalCents, currency, days, updatedAt: _u, ...rest } = row;
  return {
    ...rest,
    status: row.status as BookingStatus,
    price: { days, dailyRateCents, subtotalCents, serviceFeeCents, totalCents, currency: currency as Currency },
  };
}

function toRow(booking: NewBooking) {
  const { price, ...rest } = booking;
  return { ...rest, ...price };
}

function listConditions(filter: BookingListFilter): (SQL | undefined)[] {
  const scope =
    filter.scope === "upcoming"
      ? and(inArray(bookings.status, ["PENDING_PAYMENT", "CONFIRMED"]), sql`${bookings.returnDate} > ${filter.today}`)
      : filter.scope === "past"
        ? or(sql`${bookings.returnDate} <= ${filter.today}`, inArray(bookings.status, ["CANCELLED", "EXPIRED"]))
        : undefined;
  return [
    scope,
    filter.status ? eq(bookings.status, filter.status) : undefined,
    filter.vehicleId ? eq(bookings.vehicleId, filter.vehicleId) : undefined,
  ];
}

const listOrder = (scope: BookingListFilter["scope"]) =>
  scope === "upcoming" ? [asc(bookings.pickupDate), asc(bookings.id)] : [desc(bookings.pickupDate), desc(bookings.createdAt)];

export function createBookingRepository(tx: TransactionManager): BookingRepository {
  const db = () => tx.executor();

  async function list(party: SQL, filter: BookingListFilter, { page, pageSize }: { page: number; pageSize: number }) {
    const where = and(party, ...listConditions(filter));
    const [rows, totals] = await Promise.all([
      db().select().from(bookings).where(where).orderBy(...listOrder(filter.scope)).limit(pageSize).offset((page - 1) * pageSize),
      db().select({ total: count() }).from(bookings).where(where),
    ]);
    return { items: rows.map(toBooking), total: totals[0]?.total ?? 0 };
  }

  return {
    async findById(id) {
      const [row] = await db().select().from(bookings).where(eq(bookings.id, id));
      return row ? toBooking(row) : null;
    },

    async findByIdForUpdate(id) {
      const [row] = await db().select().from(bookings).where(eq(bookings.id, id)).for("update");
      return row ? toBooking(row) : null;
    },

    async findByRenterKey(renterId, idempotencyKey) {
      const [row] = await db()
        .select()
        .from(bookings)
        .where(and(eq(bookings.renterId, renterId), eq(bookings.idempotencyKey, idempotencyKey)));
      return row ? toBooking(row) : null;
    },

    async insert(booking) {
      try {
        const [row] = await db().insert(bookings).values(toRow(booking)).returning();
        return toBooking(row!);
      } catch (error) {
        if (isPgError(error, PgErrorCode.uniqueViolation, "bookings_renter_idempotency_key")) {
          throw new DuplicateIdempotencyKeyError();
        }
        throw error;
      }
    },

    async update(id, patch) {
      const [row] = await db()
        .update(bookings)
        .set({ ...patch, updatedAt: sql`now()` })
        .where(eq(bookings.id, id))
        .returning();
      if (!row) throw new Error(`Booking ${id} vanished during update`);
      return toBooking(row);
    },

    async expireLapsedHoldsOverlapping(vehicleId, period, now) {
      const result = await db().execute<{ booking_id: string }>(sql`
        with expired as (
          update ${bookings} set status = 'EXPIRED', updated_at = now()
          where vehicle_id = ${vehicleId}
            and status = 'PENDING_PAYMENT'
            and hold_expires_at <= ${now}
            and daterange(pickup_date, return_date) && daterange(${period.start}::date, ${period.end}::date)
          returning id
        )
        update ${vehicleReservations} set active = false
        where booking_id in (select id from expired)
        returning booking_id`);
      return result.rows.map((r) => r.booking_id);
    },

    async findLapsedHoldIds(now, limit) {
      const rows = await db()
        .select({ id: bookings.id })
        .from(bookings)
        .where(and(eq(bookings.status, "PENDING_PAYMENT"), lte(bookings.holdExpiresAt, now)))
        .orderBy(asc(bookings.holdExpiresAt))
        .limit(limit);
      return rows.map((r) => r.id);
    },

    listForRenter: (renterId, filter, page) => list(eq(bookings.renterId, renterId), filter, page),
    listForOwner: (ownerId, filter, page) => list(eq(bookings.ownerId, ownerId), filter, page),

    async listForAdmin({ status }, { page, pageSize }) {
      const where = status ? eq(bookings.status, status) : undefined;
      const [rows, totals] = await Promise.all([
        db().select().from(bookings).where(where).orderBy(desc(bookings.createdAt), desc(bookings.id)).limit(pageSize).offset((page - 1) * pageSize),
        db().select({ total: count() }).from(bookings).where(where),
      ]);
      return { items: rows.map(toBooking), total: totals[0]?.total ?? 0 };
    },

    async adminStats() {
      const rows = await db()
        .select({
          status: bookings.status,
          n: count(),
          totalCents: sql<string>`coalesce(sum(${bookings.totalCents}), 0)`,
          feeCents: sql<string>`coalesce(sum(${bookings.serviceFeeCents}), 0)`,
        })
        .from(bookings)
        .groupBy(bookings.status);
      const byStatus: Record<BookingStatus, number> = { PENDING_PAYMENT: 0, CONFIRMED: 0, CANCELLED: 0, EXPIRED: 0 };
      for (const row of rows) byStatus[row.status as BookingStatus] = row.n;
      const confirmed = rows.find((r) => r.status === "CONFIRMED");
      return {
        total: rows.reduce((sum, r) => sum + r.n, 0),
        byStatus,
        confirmedTotalCents: Number(confirmed?.totalCents ?? 0),
        confirmedServiceFeeCents: Number(confirmed?.feeCents ?? 0),
      };
    },

    async ownerEarningRows(ownerId) {
      const rows = await db()
        .select()
        .from(bookings)
        .where(
          and(
            eq(bookings.ownerId, ownerId),
            or(eq(bookings.status, "CONFIRMED"), and(eq(bookings.status, "CANCELLED"), isNotNull(bookings.confirmedAt))),
          ),
        );
      return rows.map(toBooking);
    },
  };
}
