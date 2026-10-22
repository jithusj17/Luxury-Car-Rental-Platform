import { randomUUID } from "node:crypto";
import type { CreateBookingBody, PriceBreakdown } from "@car-rental/contracts";
import { errors } from "../../../shared/errors/app-error.ts";
import { fingerprint } from "../../../shared/security/tokens.ts";
import type { User } from "../../identity/domain/user.ts";
import { priceRental, type Booking } from "../domain/booking.ts";
import { DuplicateIdempotencyKeyError, ReservationConflictError } from "../domain/errors.ts";
import { validateRentalPeriod } from "../domain/rental-policy.ts";
import { reclaimLapsedHolds } from "./booking-lifecycle.ts";
import type { BookingDeps, VehicleInfo } from "./ports.ts";

export type Quote = { vehicle: VehicleInfo; price: PriceBreakdown; available: boolean };
export type CreateBookingResult = { booking: Booking; replayed: boolean };

async function loadBookableVehicle(deps: BookingDeps, vehicleId: string): Promise<VehicleInfo> {
  const vehicle = await deps.vehicles.find(vehicleId);
  if (!vehicle || vehicle.status !== "ACTIVE") throw errors.notFound("Vehicle");
  return vehicle;
}

/** Server-side price for a period. `available` is advisory only; creation re-checks under the constraint. */
export async function quoteBooking(
  deps: BookingDeps,
  vehicleId: string,
  period: { pickupDate: string; returnDate: string },
): Promise<Quote> {
  const vehicle = await loadBookableVehicle(deps, vehicleId);
  const now = deps.clock.now();
  const days = validateRentalPeriod(period, vehicle, now);
  const range = { start: period.pickupDate, end: period.returnDate };
  const blocking = await deps.calendar.listBlockingEntries(vehicle.id, range, now);
  return { vehicle, price: priceRental(vehicle.dailyRateCents, days, vehicle.currency), available: blocking.length === 0 };
}

function replay(existing: Booking, requestHash: string): CreateBookingResult {
  if (existing.requestHash !== requestHash) {
    throw errors.idempotencyConflict("This Idempotency-Key was already used for a different booking request");
  }
  return { booking: existing, replayed: true };
}

/**
 * Places a payment hold on a vehicle for `[pickupDate, returnDate)`.
 *
 * Integrity does not rely on a prior availability check: the booking row and its calendar entry are
 * written in one transaction, and the calendar's exclusion constraint rejects any overlap — including
 * from a concurrent transaction, which Postgres makes wait and then fail. Retries with the same
 * Idempotency-Key return the original booking instead of creating a second one.
 */
export async function createBooking(
  deps: BookingDeps,
  renter: User,
  body: CreateBookingBody,
  idempotencyKey: string,
): Promise<CreateBookingResult> {
  const requestHash = fingerprint({ vehicleId: body.vehicleId, pickupDate: body.pickupDate, returnDate: body.returnDate });
  const existing = await deps.bookings.findByRenterKey(renter.id, idempotencyKey);
  if (existing) return replay(existing, requestHash);

  const vehicle = await loadBookableVehicle(deps, body.vehicleId);
  if (vehicle.ownerId === renter.id) throw errors.forbidden("You can't book your own vehicle");

  const now = deps.clock.now();
  const days = validateRentalPeriod(body, vehicle, now);
  const period = { start: body.pickupDate, end: body.returnDate };

  try {
    const booking = await deps.tx.run(async () => {
      // Reclaim holds whose payment window lapsed but that the sweeper hasn't released yet.
      await reclaimLapsedHolds(deps, vehicle.id, period, now);
      const created = await deps.bookings.insert({
        id: randomUUID(),
        vehicleId: vehicle.id,
        renterId: renter.id,
        ownerId: vehicle.ownerId,
        pickupDate: body.pickupDate,
        returnDate: body.returnDate,
        timezone: vehicle.timezone,
        status: "PENDING_PAYMENT",
        price: priceRental(vehicle.dailyRateCents, days, vehicle.currency),
        holdExpiresAt: new Date(now.getTime() + deps.config.holdMinutes * 60_000),
        idempotencyKey,
        requestHash,
      });
      await deps.calendar.addBookingEntry({ bookingId: created.id, vehicleId: vehicle.id, period, createdBy: renter.id });
      return created;
    });
    deps.metrics.bookingsCreated.inc();
    return { booking, replayed: false };
  } catch (error) {
    if (error instanceof ReservationConflictError) {
      deps.metrics.bookingConflicts.inc();
      throw errors.bookingConflict();
    }
    if (error instanceof DuplicateIdempotencyKeyError) {
      // A concurrent request with the same key won the race; answer as a replay of it.
      const winner = await deps.bookings.findByRenterKey(renter.id, idempotencyKey);
      if (winner) return replay(winner, requestHash);
    }
    throw error;
  }
}
