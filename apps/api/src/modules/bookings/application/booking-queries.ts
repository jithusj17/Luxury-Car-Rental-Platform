import type { BookingListQuery, EarningsSummary } from "@car-rental/contracts";
import { errors } from "../../../shared/errors/app-error.ts";
import type { User } from "../../identity/domain/user.ts";
import type { Booking } from "../domain/booking.ts";
import { todayIn } from "../domain/calendar-dates.ts";
import { actorFor } from "./booking-lifecycle.ts";
import type { BookingDeps, VehicleInfo } from "./ports.ts";

export type BookingView = { booking: Booking; vehicle: VehicleInfo; renterName: string; ownerName: string };

/** Loads related vehicles and names for a page of bookings in two batched queries. */
async function toViews(deps: BookingDeps, bookings: Booking[]): Promise<BookingView[]> {
  const [vehicles, names] = await Promise.all([
    deps.vehicles.findMany(bookings.map((b) => b.vehicleId)),
    deps.users.findNames(bookings.flatMap((b) => [b.renterId, b.ownerId])),
  ]);
  return bookings.map((booking) => {
    const vehicle = vehicles.get(booking.vehicleId);
    if (!vehicle) throw new Error(`Vehicle ${booking.vehicleId} missing for booking ${booking.id}`);
    return {
      booking,
      vehicle,
      renterName: names.get(booking.renterId) ?? "Renter",
      ownerName: names.get(booking.ownerId) ?? "Host",
    };
  });
}

/** Visible to its renter, the vehicle owner, and admins; 404 for everyone else. */
export async function getBooking(deps: BookingDeps, user: User, bookingId: string): Promise<BookingView> {
  const booking = await deps.bookings.findById(bookingId);
  if (!booking || !actorFor(booking, user)) throw errors.notFound("Booking");
  const [view] = await toViews(deps, [booking]);
  return view!;
}

const utcToday = (deps: BookingDeps) => todayIn("UTC", deps.clock.now());

export async function listRenterBookings(deps: BookingDeps, user: User, query: BookingListQuery) {
  const { page, pageSize, ...filter } = query;
  const result = await deps.bookings.listForRenter(user.id, { ...filter, today: utcToday(deps) }, { page, pageSize });
  return { items: await toViews(deps, result.items), total: result.total };
}

export async function listOwnerBookings(deps: BookingDeps, user: User, query: BookingListQuery) {
  const { page, pageSize, ...filter } = query;
  const result = await deps.bookings.listForOwner(user.id, { ...filter, today: utcToday(deps) }, { page, pageSize });
  return { items: await toViews(deps, result.items), total: result.total };
}

/**
 * Owner earnings: the rental subtotal (service fee excluded) of confirmed trips, plus the
 * non-refunded share of trips cancelled after payment.
 */
export async function ownerEarnings(deps: BookingDeps, user: User): Promise<EarningsSummary> {
  const rows = await deps.bookings.ownerEarningRows(user.id);
  const today = utcToday(deps);
  const byMonth = new Map<string, number>();
  let totalEarnedCents = 0;
  let upcomingCents = 0;
  let confirmedBookings = 0;

  for (const row of rows) {
    const kept =
      row.status === "CONFIRMED"
        ? row.price.subtotalCents
        : Math.round((row.price.subtotalCents * (100 - (row.refundPercent ?? 100))) / 100);
    if (row.status === "CONFIRMED") confirmedBookings += 1;
    if (row.status === "CONFIRMED" && row.returnDate > today) {
      upcomingCents += kept;
      continue;
    }
    totalEarnedCents += kept;
    const month = row.pickupDate.slice(0, 7);
    byMonth.set(month, (byMonth.get(month) ?? 0) + kept);
  }

  return {
    currency: "USD",
    totalEarnedCents,
    upcomingCents,
    confirmedBookings,
    byMonth: [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, earnedCents]) => ({ month, earnedCents })),
  };
}
