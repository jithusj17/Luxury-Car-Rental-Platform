"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bookingKeys } from "@/domains/bookings/hooks";
import { paymentsApi } from "./api";

export type PaymentAttempt = { status: "succeeded" | "failed" | string };

/**
 * Starts (or resumes) the booking's payment and submits the card at the provider. The booking is
 * confirmed asynchronously by the provider webhook, so callers poll the booking afterwards.
 */
export function usePayBooking(bookingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (cardNumber: string): Promise<PaymentAttempt> => {
      const payment = await paymentsApi.start(bookingId);
      if (!payment.clientSecret) return { status: payment.status === "SUCCEEDED" ? "succeeded" : "failed" };
      return paymentsApi.confirmWithMockProvider(payment.clientSecret, cardNumber);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: bookingKeys.detail(bookingId) }),
  });
}
