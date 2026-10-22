import type { Booking } from "@car-rental/contracts";
import { MapPin } from "lucide-react";
import Link from "next/link";
import { VehicleImage } from "@/domains/vehicles/components/vehicle-image";
import { formatDate, nightsBetween } from "@/shared/lib/dates";
import { BookingStatus } from "./booking-status";

/** Vehicle thumbnail, title, dates and status for a booking. */
export function BookingVehicleHeader({ booking }: { booking: Booking }) {
  const title = `${booking.vehicle.year} ${booking.vehicle.make} ${booking.vehicle.model}`;
  const days = nightsBetween(booking.pickupDate, booking.returnDate);
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <VehicleImage src={booking.vehicle.imageUrl} alt={title} ratio="thumb" className="w-full shrink-0 rounded-lg sm:w-44" sizes="176px" />
      <div className="flex flex-col gap-1.5">
        <BookingStatus booking={booking} />
        <h2 className="text-h4 font-medium">
          <Link href={`/cars/${booking.vehicle.slug}`} className="hover:text-primary">
            {title}
          </Link>
        </h2>
        <p className="text-sm text-heading">
          {formatDate(booking.pickupDate)} → {formatDate(booking.returnDate)} · {days} {days === 1 ? "day" : "days"}
        </p>
        <p className="flex items-center gap-1 text-xs">
          <MapPin aria-hidden className="size-3.5" /> {booking.vehicle.city} · Hosted by {booking.owner.name}
        </p>
      </div>
    </div>
  );
}
