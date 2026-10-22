/** Transactional emails the platform sends. Templates are rendered by the notifications module. */
export type EmailMessage =
  | { template: "password-reset"; to: string; data: { name: string; resetUrl: string } }
  | { template: "welcome"; to: string; data: { name: string } }
  | { template: "booking-confirmed"; to: string; data: { name: string; vehicle: string; pickupDate: string; returnDate: string; bookingUrl: string } }
  | { template: "booking-cancelled"; to: string; data: { name: string; vehicle: string; pickupDate: string; refundCents: number } }
  | { template: "booking-request-owner"; to: string; data: { name: string; vehicle: string; pickupDate: string; returnDate: string } };

/** Queues an email in the caller's transaction (outbox); delivery happens asynchronously. */
export interface EmailQueue {
  enqueue(message: EmailMessage): Promise<void>;
}
