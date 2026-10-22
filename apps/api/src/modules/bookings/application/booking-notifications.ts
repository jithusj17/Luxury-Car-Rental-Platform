import type { Booking } from "../domain/booking.ts";
import type { BookingDeps } from "./ports.ts";

/** Sequential on purpose: this runs inside a transaction, which owns a single connection. */
async function context(deps: BookingDeps, booking: Booking) {
  const vehicle = await deps.vehicles.find(booking.vehicleId);
  const renter = await deps.users.findContact(booking.renterId);
  const owner = await deps.users.findContact(booking.ownerId);
  const vehicleName = vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "vehicle";
  return { vehicleName, renter, owner };
}

/** Queued in the confirming transaction, so emails go out only if the confirmation commits. */
export async function notifyBookingConfirmed(deps: BookingDeps, booking: Booking): Promise<void> {
  const { vehicleName, renter, owner } = await context(deps, booking);
  const dates = { pickupDate: booking.pickupDate, returnDate: booking.returnDate };
  if (renter) {
    await deps.emails.enqueue({
      template: "booking-confirmed",
      to: renter.email,
      data: { name: renter.name, vehicle: vehicleName, ...dates, bookingUrl: `${deps.config.webUrl}/dashboard/bookings/${booking.id}` },
    });
  }
  if (owner) {
    await deps.emails.enqueue({ template: "booking-request-owner", to: owner.email, data: { name: owner.name, vehicle: vehicleName, ...dates } });
  }
}

export async function notifyBookingCancelled(deps: BookingDeps, booking: Booking): Promise<void> {
  const { vehicleName, renter } = await context(deps, booking);
  if (!renter) return;
  const refundCents = booking.price.totalCents * ((booking.refundPercent ?? 0) / 100);
  await deps.emails.enqueue({
    template: "booking-cancelled",
    to: renter.email,
    data: { name: renter.name, vehicle: vehicleName, pickupDate: booking.pickupDate, refundCents: Math.round(refundCents) },
  });
}
