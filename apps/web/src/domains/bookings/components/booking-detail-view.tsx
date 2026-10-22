"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/domains/auth/hooks";
import { errorMessage } from "@/shared/api/api-error";
import { Button } from "@/shared/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { ErrorState, Skeleton } from "@/shared/components/ui/feedback";
import { FormAlert } from "@/shared/components/ui/form-alert";
import { Textarea } from "@/shared/components/ui/input";
import { useToast } from "@/shared/components/ui/toast";
import { formatDateTime } from "@/shared/lib/dates";
import { formatPrice } from "@/shared/lib/utils";
import { useBookingDetail, useCancelBooking } from "../hooks";
import { BookingSummary } from "./booking-summary";
import { BookingVehicleHeader } from "./booking-vehicle-header";

/** Booking detail for its renter or host: summary, timeline, cancellation with policy terms. */
export function BookingDetailView({ bookingId }: { bookingId: string }) {
  const { user } = useAuth();
  const booking = useBookingDetail(bookingId);
  const cancel = useCancelBooking();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");

  if (booking.isPending) return <Skeleton className="h-96 rounded-xl" />;
  if (booking.isError) return <ErrorState title="Booking not found" description="This booking doesn’t exist or you don’t have access to it." />;
  const b = booking.data;
  const isHost = user?.id === b.owner.id;
  const refund = Math.round((b.price.totalCents * b.cancellation.refundPercent) / 100);

  async function confirmCancel() {
    try {
      await cancel.mutateAsync({ id: b.id, reason: reason.trim() || undefined });
      setConfirming(false);
      toast.success("Booking cancelled", refund > 0 && b.status === "CONFIRMED" ? `${formatPrice(refund, b.price.currency)} will be refunded.` : undefined);
    } catch {
      // Shown inside the dialog via cancel.error.
    }
  }

  const timeline = [
    ["Requested", b.createdAt],
    ["Confirmed", b.confirmedAt],
    ["Cancelled", b.cancelledAt],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex flex-col gap-6">
        <Card>
          <BookingVehicleHeader booking={b} />
        </Card>
        {b.status === "PENDING_PAYMENT" && !isHost && (
          <FormAlert>
            This booking isn’t paid yet.{" "}
            <Link href={`/checkout/${b.id}`} className="font-semibold underline">
              Complete payment
            </Link>{" "}
            before your hold expires.
          </FormAlert>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <ol className="flex flex-col gap-3 border-l-2 border-border pl-5">
            {timeline.map(([label, at]) => (
              <li key={label}>
                <p className="font-heading font-medium text-heading">{label}</p>
                <p className="text-xs">{formatDateTime(at)}</p>
              </li>
            ))}
          </ol>
          {b.cancellationReason && <p className="mt-4 text-sm">Reason: “{b.cancellationReason}”</p>}
        </Card>
      </div>

      <aside className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{isHost ? "Earnings" : "Price details"}</CardTitle>
          </CardHeader>
          <BookingSummary price={b.price} />
          {b.refundedCents > 0 && <p className="mt-4 text-sm text-success-strong">Refunded {formatPrice(b.refundedCents, b.price.currency)}</p>}
        </Card>
        {b.cancellation.allowed && (
          <Card>
            <CardHeader>
              <CardTitle>Cancel booking</CardTitle>
            </CardHeader>
            <p className="mb-4 text-sm">
              {b.status === "PENDING_PAYMENT"
                ? "Nothing has been charged yet."
                : `Cancelling now refunds ${b.cancellation.refundPercent}% (${formatPrice(refund, b.price.currency)}).`}
            </p>
            <Button variant="secondary" className="w-full" onClick={() => setConfirming(true)}>
              Cancel booking
            </Button>
          </Card>
        )}
      </aside>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Cancel this booking?"
        description={b.status === "CONFIRMED" ? `You'll be refunded ${formatPrice(refund, b.price.currency)}. This can't be undone.` : "The dates will be released. This can't be undone."}
        confirmLabel="Cancel booking"
        destructive
        pending={cancel.isPending}
        onConfirm={confirmCancel}
      >
        <label htmlFor="cancel-reason" className="font-heading text-sm font-medium text-heading">
          Reason (optional)
        </label>
        <Textarea id="cancel-reason" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-20" />
        {cancel.isError && <FormAlert>{errorMessage(cancel.error)}</FormAlert>}
      </ConfirmDialog>
    </div>
  );
}
