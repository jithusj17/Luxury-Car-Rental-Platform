"use client";

import type { Payment } from "@car-rental/contracts";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { errorMessage } from "@/shared/api/api-error";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/feedback";
import { FormAlert } from "@/shared/components/ui/form-alert";
import { paymentsApi } from "../api";
import { PaymentForm } from "./payment-form";
import { StripePaymentForm } from "./stripe-payment-form";

type Props = { bookingId: string; amountLabel: string; onSubmitted: () => void };

/**
 * Opens (or resumes) the booking's payment and shows the matching form: Stripe's Payment Element
 * when the API uses Stripe, the test-card form for the development provider.
 */
export function PaymentStep({ bookingId, amountLabel, onSubmitted }: Props) {
  const start = useMutation<Payment>({ mutationFn: () => paymentsApi.start(bookingId) });
  const { mutate } = start;
  useEffect(() => mutate(), [mutate]);

  if (start.isError) {
    return (
      <div className="flex flex-col gap-4">
        <FormAlert>{errorMessage(start.error)}</FormAlert>
        <Button variant="secondary" onClick={() => start.mutate()}>Try again</Button>
      </div>
    );
  }
  if (!start.data) return <Skeleton className="h-40" aria-label="Preparing payment" />;
  if (start.data.provider === "stripe" && start.data.clientSecret) {
    return <StripePaymentForm clientSecret={start.data.clientSecret} amountLabel={amountLabel} onSubmitted={onSubmitted} />;
  }
  return <PaymentForm bookingId={bookingId} amountLabel={amountLabel} onSubmitted={onSubmitted} />;
}
