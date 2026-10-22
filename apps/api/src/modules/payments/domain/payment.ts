import type { Currency, PaymentStatus } from "@car-rental/contracts";

export type Payment = {
  id: string;
  bookingId: string;
  renterId: string;
  amountCents: number;
  refundedCents: number;
  currency: Currency;
  status: PaymentStatus;
  provider: string;
  providerPaymentId: string | null;
  clientSecret: string | null;
  failureReason: string | null;
  succeededAt: Date | null;
  createdAt: Date;
};

/**
 * REQUIRES_ACTION → SUCCEEDED | FAILED | CANCELLED.
 * The provider is the source of truth for captured money, so a payment we cancelled or saw fail
 * may still move to SUCCEEDED if the provider later reports a capture (the booking flow then refunds).
 */
const transitions: Record<PaymentStatus, PaymentStatus[]> = {
  REQUIRES_ACTION: ["SUCCEEDED", "FAILED", "CANCELLED"],
  FAILED: ["SUCCEEDED"],
  CANCELLED: ["SUCCEEDED"],
  SUCCEEDED: [],
};

export function canTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  return transitions[from].includes(to);
}

/** Refund for `percent`% of the charge, capped by what hasn't been refunded yet. */
export function refundAmount(payment: Pick<Payment, "amountCents" | "refundedCents">, percent: number): number {
  const requested = Math.round((payment.amountCents * percent) / 100);
  return Math.max(0, Math.min(requested, payment.amountCents - payment.refundedCents));
}
