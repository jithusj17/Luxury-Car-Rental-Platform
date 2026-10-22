import type { Booking } from "@car-rental/contracts";
import Link from "next/link";
import { VehicleImage } from "@/domains/vehicles/components/vehicle-image";
import { buttonVariants } from "@/shared/components/ui/button";
import { DataTable } from "@/shared/components/ui/data-table";
import { formatShortDate } from "@/shared/lib/dates";
import { cn, formatPrice } from "@/shared/lib/utils";
import { BookingStatus } from "./booking-status";

/** Bookings list in the dashboard table style; `perspective` picks renter or host columns. */
export function BookingsTable({ bookings, perspective }: { bookings: Booking[]; perspective: "renter" | "owner" }) {
  return (
    <DataTable
      caption={perspective === "renter" ? "Your bookings" : "Bookings on your vehicles"}
      rows={bookings}
      rowKey={(b) => b.id}
      columns={[
        {
          header: "Vehicle",
          cell: (b) => (
            <div className="flex items-center gap-4">
              <VehicleImage src={b.vehicle.imageUrl} alt="" ratio="thumb" className="w-28 shrink-0 rounded-lg" sizes="112px" />
              <div>
                <p className="font-heading font-medium text-heading">
                  {b.vehicle.year} {b.vehicle.make} {b.vehicle.model}
                </p>
                <p className="text-xs">{perspective === "renter" ? `Host: ${b.owner.name}` : `Renter: ${b.renter.name}`}</p>
              </div>
            </div>
          ),
        },
        { header: "Dates", cell: (b) => <span className="text-sm text-heading">{formatShortDate(b.pickupDate)} – {formatShortDate(b.returnDate)}</span> },
        { header: "Status", cell: (b) => <BookingStatus booking={b} /> },
        {
          header: perspective === "renter" ? "Total" : "Your earnings",
          cell: (b) => (
            <span className="font-heading font-medium text-primary">
              {formatPrice(perspective === "renter" ? b.price.totalCents : b.price.subtotalCents, b.price.currency)}
            </span>
          ),
        },
        {
          header: "Action",
          className: "md:text-right",
          cell: (b) => (
            <Link href={`/dashboard/bookings/${b.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              View
            </Link>
          ),
        },
      ]}
    />
  );
}
