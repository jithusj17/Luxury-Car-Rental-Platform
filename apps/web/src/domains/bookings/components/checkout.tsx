"use client";

import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { PaymentStep } from "@/domains/payments/components/payment-step";
import { Button } from "@/shared/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { ErrorState, LoadingSpinner, Skeleton } from "@/shared/components/ui/feedback";
import { formatPrice } from "@/shared/lib/utils";
import { useBookingDetail } from "../hooks";
import { BookingSummary } from "./booking-summary";
import { BookingVehicleHeader } from "./booking-vehicle-header";
import { HoldCountdown } from "./hold-countdown";

/** Checkout: review the held booking, pay, then wait for the provider's confirmation. */
export function Checkout({ bookingId }: { bookingId: string }) {
  // Returning from a redirect-based payment step (e.g. 3-D Secure): wait for the webhook confirmation.
  const returnedFromProvider = useSearchParams().get("redirect_status") === "succeeded";
  const [submitted, setSubmitted] = useState(returnedFromProvider);
  const booking = useBookingDetail(bookingId, { pollWhilePending: submitted });

  if (booking.isPending) return <Skeleton className="h-96 rounded-xl" />;
  if (booking.isError) return <ErrorState title="Booking not found" description="This booking doesn’t exist or isn’t yours." />;
  const b = booking.data;

  if (b.status === "CONFIRMED") {
    return (
      <Card className="flex flex-col items-center gap-4 py-12 text-center">
        <CircleCheck aria-hidden className="size-14 fill-success text-white" />
        <h1 className="text-h2 font-semibold">You’re booked!</h1>
        <p className="max-w-md">A confirmation has been emailed to you. You can manage this trip from your dashboard.</p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href={`/dashboard/bookings/${b.id}`}>View booking</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/cars">Keep browsing</Link>
          </Button>
        </div>
      </Card>
    );
  }

  if (b.status !== "PENDING_PAYMENT") {
    return (
      <ErrorState
        title={b.status === "EXPIRED" ? "Your hold expired" : "This booking was cancelled"}
        description="These dates are no longer reserved for you. You can try booking again."
        action={
          <Button asChild>
            <Link href={`/cars/${b.vehicle.slug}`}>Back to the car</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_410px]">
      <div className="flex flex-col gap-6">
        <h1 className="text-h2 font-semibold sm:text-h1">Confirm and pay</h1>
        {b.holdExpiresAt && <HoldCountdown expiresAt={b.holdExpiresAt} onExpire={() => void booking.refetch()} />}
        <Card>
          <CardHeader>
            <CardTitle>Your trip</CardTitle>
          </CardHeader>
          <BookingVehicleHeader booking={b} />
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Payment</CardTitle>
          </CardHeader>
          {submitted ? (
            <div className="flex items-center gap-3">
              <LoadingSpinner label="Confirming payment" />
              <p>Payment received — confirming your booking…</p>
            </div>
          ) : (
            <PaymentStep bookingId={b.id} amountLabel={formatPrice(b.price.totalCents, b.price.currency)} onSubmitted={() => setSubmitted(true)} />
          )}
        </Card>
      </div>
      <aside className="lg:sticky lg:top-[122px] lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle>Price details</CardTitle>
          </CardHeader>
          <BookingSummary price={b.price} />
          <p className="mt-5 text-xs">Free cancellation up to 48 hours before pick-up. After that, 50% is refunded until pick-up.</p>
        </Card>
      </aside>
    </div>
  );
}
