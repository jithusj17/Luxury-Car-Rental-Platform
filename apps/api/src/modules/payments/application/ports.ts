import type { BookingStatus, Currency } from "@car-rental/contracts";
import type { Clock } from "../../../shared/clock.ts";
import type { TransactionManager } from "../../../shared/db/transaction.ts";
import type { Metrics } from "../../../shared/observability/metrics.ts";
import type { Outbox } from "../../../shared/outbox/outbox.ts";
import type { Payment } from "../domain/payment.ts";

export type ProviderPaymentStatus = "requires_action" | "succeeded" | "failed" | "canceled";

export type ProviderEvent = {
  id: string;
  type: "payment.succeeded" | "payment.failed" | "payment.canceled";
  providerPaymentId: string;
  failureReason?: string;
};

/** Port to an external payment provider. Every mutating call takes an idempotency key. */
export interface PaymentProvider {
  readonly name: string;
  createPayment(input: { reference: string; amountCents: number; currency: Currency; idempotencyKey: string }): Promise<{
    providerPaymentId: string;
    clientSecret: string;
  }>;
  retrievePayment(providerPaymentId: string): Promise<{ status: ProviderPaymentStatus; failureReason?: string }>;
  cancelPayment(providerPaymentId: string): Promise<{ status: ProviderPaymentStatus }>;
  refund(input: { providerPaymentId: string; amountCents: number; idempotencyKey: string }): Promise<{ providerRefundId: string }>;
  /** Verifies the signature and parses the event; throws on an invalid or stale signature. */
  verifyWebhook(rawBody: string, headers: Record<string, string | string[] | undefined>): ProviderEvent;
}

export type NewRefund = { id: string; paymentId: string; amountCents: number; reason: string; idempotencyKey: string };

export interface PaymentRepository {
  /** Returns null if the booking already has an open or successful payment. */
  insert(payment: Omit<Payment, "succeededAt" | "refundedCents">): Promise<Payment | null>;
  findById(id: string): Promise<Payment | null>;
  findActiveForBooking(bookingId: string): Promise<Payment | null>;
  findByProviderIdForUpdate(providerPaymentId: string): Promise<Payment | null>;
  update(id: string, patch: Partial<Pick<Payment, "status" | "providerPaymentId" | "clientSecret" | "failureReason" | "succeededAt">>): Promise<void>;
  /** Cancels other REQUIRES_ACTION attempts for the booking; returns their provider ids. */
  cancelOtherOpenAttempts(bookingId: string, exceptPaymentId: string): Promise<string[]>;
  findStaleOpen(createdBefore: Date, limit: number): Promise<Payment[]>;
  /** Records a refund and reserves its amount; false if this idempotency key was already used. */
  reserveRefund(refund: NewRefund): Promise<boolean>;
  findRefund(id: string): Promise<{ id: string; paymentId: string; amountCents: number; idempotencyKey: string; status: string } | null>;
  completeRefund(id: string, status: "SUCCEEDED" | "FAILED", providerRefundId: string | null): Promise<void>;
}

export interface WebhookInbox {
  /** Stores the event; false if it was already processed (duplicate delivery). */
  recordIfNew(provider: string, event: ProviderEvent): Promise<boolean>;
}

export type PaidOutcome = "confirmed" | "already-confirmed" | "slot-lost" | "cancelled";

/** Provided by the bookings module. */
export interface BookingGateway {
  getForPayment(bookingId: string): Promise<{
    id: string;
    renterId: string;
    status: BookingStatus;
    totalCents: number;
    currency: Currency;
    holdExpiresAt: Date | null;
  } | null>;
  confirmPaid(bookingId: string): Promise<PaidOutcome>;
}

export type PaymentDeps = {
  payments: PaymentRepository;
  inbox: WebhookInbox;
  provider: PaymentProvider;
  bookings: BookingGateway;
  outbox: Outbox;
  tx: TransactionManager;
  clock: Clock;
  metrics: Metrics;
};

export const PAYMENT_JOBS = {
  refund: "payments.refund",
  cancelAtProvider: "payments.cancel-at-provider",
} as const;
  cancelOpenForBooking: "payments.cancel-open-for-booking",
