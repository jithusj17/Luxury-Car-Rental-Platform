import { sql } from "drizzle-orm";
import { boolean, char, check, date, index, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { daterange } from "../../../shared/db/types.ts";
import { users } from "../../identity/infrastructure/schema.ts";
import { vehicles } from "../../vehicles/infrastructure/schema.ts";

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey(),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "restrict" }),
    renterId: uuid("renter_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    pickupDate: date("pickup_date", { mode: "string" }).notNull(),
    returnDate: date("return_date", { mode: "string" }).notNull(),
    /** Vehicle timezone at booking time; rental days and cancellation windows use it. */
    timezone: text("timezone").notNull(),
    days: integer("days").notNull(),
    status: text("status").notNull(),
    dailyRateCents: integer("daily_rate_cents").notNull(),
    subtotalCents: integer("subtotal_cents").notNull(),
    serviceFeeCents: integer("service_fee_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    currency: char("currency", { length: 3 }).notNull(),
    holdExpiresAt: timestamp("hold_expires_at", { withTimezone: true }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelledBy: uuid("cancelled_by"),
    cancellationReason: text("cancellation_reason"),
    refundPercent: integer("refund_percent"),
    /** Client-supplied retry key, unique per renter. Replays return the original booking. */
    idempotencyKey: text("idempotency_key").notNull(),
    requestHash: text("request_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("bookings_renter_idempotency_key").on(t.renterId, t.idempotencyKey),
    check("bookings_status_check", sql`${t.status} in ('PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'EXPIRED')`),
    check("bookings_period_check", sql`${t.pickupDate} < ${t.returnDate}`),
    check("bookings_amounts_check", sql`${t.totalCents} = ${t.subtotalCents} + ${t.serviceFeeCents}`),
    index("bookings_renter_idx").on(t.renterId, t.pickupDate.desc()),
    index("bookings_owner_idx").on(t.ownerId, t.pickupDate.desc()),
    index("bookings_vehicle_idx").on(t.vehicleId),
    index("bookings_pending_hold_idx").on(t.holdExpiresAt).where(sql`${t.status} = 'PENDING_PAYMENT'`),
  ],
);

/**
 * The vehicle calendar. Every row that blocks a vehicle (booking hold, confirmed booking, owner block)
 * lives here; an exclusion constraint (see migration 0001) forbids overlapping *active* rows per vehicle.
 */
export const vehicleReservations = pgTable(
  "vehicle_reservations",
  {
    id: uuid("id").primaryKey(),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "restrict" }),
    period: daterange("period").notNull(),
    kind: text("kind").notNull(),
    bookingId: uuid("booking_id")
      .unique()
      .references(() => bookings.id, { onDelete: "cascade" }),
    note: text("note"),
    active: boolean("active").notNull().default(true),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("vehicle_reservations_kind_check", sql`${t.kind} in ('BOOKING', 'OWNER_BLOCK')`),
    check("vehicle_reservations_booking_link_check", sql`(${t.kind} = 'BOOKING') = (${t.bookingId} is not null)`),
  ],
);
