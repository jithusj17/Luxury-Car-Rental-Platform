import type { Booking as BookingDto } from "@car-rental/contracts";
import type { User } from "../../identity/domain/user.ts";
import { actorFor } from "../application/booking-lifecycle.ts";
import type { BookingView } from "../application/booking-queries.ts";
import { cancellationTerms } from "../domain/rental-policy.ts";

const iso = (date: Date | null) => (date ? date.toISOString() : null);

/** Cancellation terms are computed for the viewer, so each party sees what *they* can do. */
export function toBookingDto({ booking, vehicle, renterName, ownerName }: BookingView, viewer: User, now: Date): BookingDto {
  const actor = actorFor(booking, viewer);
  const refundedCents =
    booking.status === "CANCELLED" && booking.confirmedAt
      ? Math.round((booking.price.totalCents * (booking.refundPercent ?? 0)) / 100)
      : 0;
  return {
    id: booking.id,
    status: booking.status,
    pickupDate: booking.pickupDate,
    returnDate: booking.returnDate,
    price: booking.price,
    holdExpiresAt: iso(booking.holdExpiresAt),
    createdAt: booking.createdAt.toISOString(),
    confirmedAt: iso(booking.confirmedAt),
    cancelledAt: iso(booking.cancelledAt),
    cancellationReason: booking.cancellationReason,
    refundedCents,
    vehicle: {
      id: vehicle.id,
      slug: vehicle.slug,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      city: vehicle.city,
      imageUrl: vehicle.imageUrl,
    },
    renter: { id: booking.renterId, name: renterName },
    owner: { id: booking.ownerId, name: ownerName },
    cancellation: actor ? cancellationTerms(booking, actor, now) : { allowed: false, refundPercent: 0 },
  };
}
