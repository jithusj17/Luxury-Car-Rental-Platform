import { randomUUID } from "node:crypto";
import type { CalendarEntry, CreateBlockBody } from "@car-rental/contracts";
import { errors } from "../../../shared/errors/app-error.ts";
import { isAdmin, type User } from "../../identity/domain/user.ts";
import { daysBetween, mergePeriods, type Period } from "../domain/calendar-dates.ts";
import { ReservationConflictError } from "../domain/errors.ts";
import { reclaimLapsedHolds } from "./booking-lifecycle.ts";
import type { BookingDeps, VehicleInfo } from "./ports.ts";

const MAX_RANGE_DAYS = 366;

function assertRange(range: Period): void {
  if (daysBetween(range.start, range.end) > MAX_RANGE_DAYS) {
    throw errors.validation(`Date range can't exceed ${MAX_RANGE_DAYS} days`);
  }
}

async function loadOwnedVehicle(deps: BookingDeps, user: User, vehicleId: string): Promise<VehicleInfo> {
  const vehicle = await deps.vehicles.find(vehicleId);
  if (!vehicle || (vehicle.ownerId !== user.id && !isAdmin(user))) throw errors.notFound("Vehicle");
  return vehicle;
}

/** Public: periods that can't be booked. Who booked them is never exposed. */
export async function getAvailability(deps: BookingDeps, vehicleId: string, range: Period): Promise<Period[]> {
  assertRange(range);
  const vehicle = await deps.vehicles.find(vehicleId);
  if (!vehicle || vehicle.status !== "ACTIVE") throw errors.notFound("Vehicle");
  const entries = await deps.calendar.listBlockingEntries(vehicleId, range, deps.clock.now());
  return mergePeriods(entries.map((e) => e.period)).map((p) => ({
    start: p.start < range.start ? range.start : p.start,
    end: p.end > range.end ? range.end : p.end,
  }));
}

/** Owner view of the calendar: bookings (with renter names) and manual blocks. */
export async function getOwnerCalendar(deps: BookingDeps, user: User, vehicleId: string, range: Period): Promise<CalendarEntry[]> {
  assertRange(range);
  await loadOwnedVehicle(deps, user, vehicleId);
  const entries = await deps.calendar.listBlockingEntries(vehicleId, range, deps.clock.now());
  const names = await deps.users.findNames(entries.flatMap((e) => (e.renterId ? [e.renterId] : [])));
  return entries.map((e) => ({
    kind: e.kind,
    id: e.bookingId ?? e.id,
    startDate: e.period.start,
    endDate: e.period.end,
    label: e.kind === "BOOKING" ? (names.get(e.renterId ?? "") ?? "Booking") : (e.note ?? "Blocked"),
    status: e.bookingStatus,
  }));
}

/** Owner blocks dates (maintenance, personal use). Uses the same overlap constraint as bookings. */
export async function createBlock(deps: BookingDeps, user: User, body: CreateBlockBody) {
  await loadOwnedVehicle(deps, user, body.vehicleId);
  const period = { start: body.startDate, end: body.endDate };
  assertRange(period);
  const block = { id: randomUUID(), vehicleId: body.vehicleId, period, note: body.note ?? null, createdBy: user.id };
  const now = deps.clock.now();
  try {
    await deps.tx.run(async () => {
      await deps.calendar.lockVehicleCalendar(body.vehicleId);
      await reclaimLapsedHolds(deps, body.vehicleId, period, now);
      await deps.calendar.addBlock(block);
    });
  } catch (error) {
    if (error instanceof ReservationConflictError) throw errors.bookingConflict("Those dates overlap a booking or another block");
    throw error;
  }
  return { id: block.id, vehicleId: block.vehicleId, startDate: period.start, endDate: period.end, note: block.note };
}

export async function deleteBlock(deps: BookingDeps, user: User, blockId: string): Promise<void> {
  const block = await deps.calendar.findBlock(blockId);
  if (!block) throw errors.notFound("Block");
  await loadOwnedVehicle(deps, user, block.vehicleId);
  await deps.calendar.deleteBlock(blockId);
}
