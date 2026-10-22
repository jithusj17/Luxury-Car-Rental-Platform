import type { EmailMessage } from "./email.ts";

export type RenderedEmail = { to: string; subject: string; text: string };

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

/** Plain-text templates; swapping in HTML templates later only touches this file. */
export function renderEmail(message: EmailMessage): RenderedEmail {
  const { to } = message;
  switch (message.template) {
    case "welcome":
      return { to, subject: "Welcome to Car Rental", text: `Hi ${message.data.name}, your account is ready.` };
    case "password-reset":
      return {
        to,
        subject: "Reset your password",
        text: `Hi ${message.data.name},\n\nReset your password within one hour:\n${message.data.resetUrl}\n\nIf you didn't ask for this, ignore this email.`,
      };
    case "booking-confirmed":
      return {
        to,
        subject: `Booking confirmed: ${message.data.vehicle}`,
        text: `Hi ${message.data.name}, your ${message.data.vehicle} is booked from ${message.data.pickupDate} to ${message.data.returnDate}.\n${message.data.bookingUrl}`,
      };
    case "booking-cancelled":
      return {
        to,
        subject: `Booking cancelled: ${message.data.vehicle}`,
        text: `Hi ${message.data.name}, your booking starting ${message.data.pickupDate} was cancelled.${
          message.data.refundCents > 0 ? ` A refund of ${money(message.data.refundCents)} is on its way.` : ""
        }`,
      };
    case "booking-request-owner":
      return {
        to,
        subject: `New booking: ${message.data.vehicle}`,
        text: `Hi ${message.data.name}, your ${message.data.vehicle} was booked from ${message.data.pickupDate} to ${message.data.returnDate}.`,
      };
  }
}
