import type { EmailMessage } from "./email.ts";

export type RenderedEmail = { to: string; subject: string; text: string; html: string };

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Branded HTML version of a plain-text email; URLs become buttons. All content is escaped. */
function toHtml(subject: string, text: string): string {
  const blocks = text.split(/\n{2,}/).map((block) => {
    const trimmed = block.trim();
    if (/^https?:\/\/\S+$/.test(trimmed)) {
      const url = escapeHtml(trimmed);
      return `<p style="margin:24px 0"><a href="${url}" style="background:#ff7101;color:#fff;padding:12px 20px;border-radius:14px;text-decoration:none;font-weight:600">Open link</a></p><p style="font-size:12px;color:#696665">${url}</p>`;
    }
    return `<p style="margin:0 0 16px">${escapeHtml(trimmed).replace(/\n/g, "<br>")}</p>`;
  });
  return `<!doctype html><html><body style="margin:0;background:#f2f2f2;font-family:Arial,Helvetica,sans-serif;color:#24272c">
<div style="max-width:560px;margin:0 auto;padding:32px 16px"><div style="background:#fff;border-radius:16px;padding:32px">
<p style="margin:0 0 24px;font-size:20px;font-weight:700;color:#ff7101">Car Rental</p>
<h1 style="margin:0 0 16px;font-size:20px">${escapeHtml(subject)}</h1>${blocks.join("")}
</div><p style="font-size:12px;color:#696665;text-align:center">You received this email because of activity on your Car Rental account.</p></div></body></html>`;
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

/** Every email is sent as plain text plus a generated HTML version. */
export function renderEmail(message: EmailMessage): RenderedEmail {
  const email = renderText(message);
  return { ...email, html: toHtml(email.subject, email.text) };
}

function renderText(message: EmailMessage): Omit<RenderedEmail, "html"> {
  const { to } = message;
  switch (message.template) {
    case "welcome":
      return {
        to,
        subject: "Welcome to Car Rental: please confirm your email",
        text: `Hi ${message.data.name}, your account is ready.

Please confirm your email address within 24 hours:

${message.data.verifyUrl}`,
      };
    case "verify-email":
      return {
        to,
        subject: "Confirm your email",
        text: `Hi ${message.data.name},

Confirm your email address within 24 hours:

${message.data.verifyUrl}

If you didn't ask for this, ignore this email.`,
      };
    case "password-reset":
      return {
        to,
        subject: "Reset your password",
        text: `Hi ${message.data.name},\n\nReset your password within one hour:\n\n${message.data.resetUrl}\n\nIf you didn't ask for this, ignore this email.`,
      };
    case "booking-confirmed":
      return {
        to,
        subject: `Booking confirmed: ${message.data.vehicle}`,
        text: `Hi ${message.data.name}, your ${message.data.vehicle} is booked from ${message.data.pickupDate} to ${message.data.returnDate}.\n\n${message.data.bookingUrl}`,
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
