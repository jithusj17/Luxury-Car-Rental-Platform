import type { Booking, BookingStatus as Status } from "@car-rental/contracts";
import { Badge, type BadgeProps } from "@/shared/components/ui/badge";
import { todayIso } from "@/shared/lib/dates";

const statusStyles: Record<Status, { label: string; variant: BadgeProps["variant"] }> = {
  PENDING_PAYMENT: { label: "Awaiting payment", variant: "soft" },
  CONFIRMED: { label: "Confirmed", variant: "success" },
  CANCELLED: { label: "Cancelled", variant: "danger" },
  EXPIRED: { label: "Expired", variant: "neutral" },
};

/** Status pill; confirmed trips also show whether they're upcoming, ongoing or completed. */
export function BookingStatus({ booking }: { booking: Pick<Booking, "status" | "pickupDate" | "returnDate"> }) {
  if (booking.status === "CONFIRMED") {
    const today = todayIso();
    if (booking.returnDate <= today) return <Badge variant="neutral">Completed</Badge>;
    if (booking.pickupDate <= today) return <Badge variant="info">In progress</Badge>;
  }
  const { label, variant } = statusStyles[booking.status];
  return <Badge variant={variant}>{label}</Badge>;
}
