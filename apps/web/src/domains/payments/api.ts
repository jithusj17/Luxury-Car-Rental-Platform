import type { Payment } from "@car-rental/contracts";
import { apiRequest } from "@/shared/api/client";

export const paymentsApi = {
  /** Opens (or returns the open) payment for a held booking. */
  start: (bookingId: string) => apiRequest<Payment>(`/v1/bookings/${bookingId}/payments`, { method: "POST", body: {} }),
  /**
   * Card step of the development payment provider. With a real provider this is replaced by its
   * hosted fields / SDK; card data never reaches our API.
   */
  confirmWithMockProvider: (clientSecret: string, cardNumber: string) =>
    apiRequest<{ status: string }>("/v1/mock-provider/confirm", { method: "POST", body: { clientSecret, cardNumber } }),
};

export const TEST_CARDS = [
  { number: "4242424242424242", label: "Succeeds" },
  { number: "4000000000000002", label: "Declined" },
  { number: "4000000000009995", label: "Insufficient funds" },
] as const;
