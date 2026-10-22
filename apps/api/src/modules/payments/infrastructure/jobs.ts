import type { Outbox } from "../../../shared/outbox/outbox.ts";
import { cancelAtProvider, cancelOpenPaymentForBooking, executeRefund } from "../application/payment-maintenance.ts";
import { PAYMENT_JOBS, type PaymentDeps } from "../application/ports.ts";

export function registerPaymentJobs(outbox: Outbox, deps: PaymentDeps): void {
  outbox.register(PAYMENT_JOBS.refund, (payload) => executeRefund(deps, (payload as { refundId: string }).refundId));
  outbox.register(PAYMENT_JOBS.cancelOpenForBooking, (payload) =>
    cancelOpenPaymentForBooking(deps, (payload as { bookingId: string }).bookingId),
  );
  outbox.register(PAYMENT_JOBS.cancelAtProvider, (payload) =>
    cancelAtProvider(deps, (payload as { providerPaymentId: string }).providerPaymentId),
  );
}
