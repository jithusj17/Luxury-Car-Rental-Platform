import { Counter, Histogram, Registry, collectDefaultMetrics } from "prom-client";

export type Metrics = ReturnType<typeof createMetrics>;

/** Prometheus metrics. Counters marked (alert) back the alerting rules in docs/operations.md. */
export function createMetrics() {
  const registry = new Registry();
  collectDefaultMetrics({ register: registry });

  const counter = (name: string, help: string, labelNames: string[] = []) =>
    new Counter({ name, help, labelNames, registers: [registry] });

  return {
    registry,
    httpDuration: new Histogram({
      name: "http_request_duration_seconds",
      help: "HTTP request latency",
      labelNames: ["method", "route", "status"],
      buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [registry],
    }),
    bookingsCreated: counter("bookings_created_total", "Booking holds created"),
    bookingConflicts: counter("booking_conflicts_total", "Booking attempts rejected by the overlap constraint (alert)"),
    holdsExpired: counter("booking_holds_expired_total", "Unpaid holds released"),
    paymentFailures: counter("payment_failures_total", "Failed payments", ["reason"]),
    latePaymentRefunds: counter("payment_late_refunds_total", "Payments refunded because the slot was lost (alert)"),
    outboxFailures: counter("outbox_jobs_failed_total", "Outbox jobs that exhausted retries (alert)", ["type"]),
  };
}
