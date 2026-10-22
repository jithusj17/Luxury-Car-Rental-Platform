import type { FastifyBaseLogger } from "fastify";
import nodemailer from "nodemailer";
import type { Outbox } from "../../../shared/outbox/outbox.ts";
import type { EmailMessage, EmailQueue } from "../application/email.ts";
import { renderEmail, type RenderedEmail } from "../application/templates.ts";

export const EMAIL_JOB = "email.send";

export interface EmailSender {
  send(email: RenderedEmail): Promise<void>;
}

export function createOutboxEmailQueue(outbox: Outbox): EmailQueue {
  return { enqueue: (message) => outbox.enqueue(EMAIL_JOB, message) };
}

/**
 * Development sender: writes emails to the log so links (e.g. password reset) can be followed.
 * Replace with an SMTP/API sender in production; bodies are logged only outside production.
 */
export function createLogEmailSender(logger: FastifyBaseLogger, includeBody: boolean): EmailSender & { sent: RenderedEmail[] } {
  const sent: RenderedEmail[] = [];
  return {
    sent,
    async send(email) {
      sent.push(email);
      if (sent.length > 100) sent.shift();
      logger.info({ to: email.to, subject: email.subject, ...(includeBody && { body: email.text }) }, "Email sent");
    },
  };
}

/**
 * Sends through any SMTP service (Resend, SendGrid, Amazon SES, Postmark, Mailgun all offer SMTP).
 * Failures throw, so the outbox retries with backoff.
 */
export function createSmtpEmailSender(smtpUrl: string, from: string): EmailSender {
  const transport = nodemailer.createTransport(smtpUrl);
  return {
    async send(email) {
      await transport.sendMail({ from, to: email.to, subject: email.subject, text: email.text, html: email.html });
    },
  };
}

export function registerEmailDelivery(outbox: Outbox, sender: EmailSender): void {
  outbox.register(EMAIL_JOB, (payload) => sender.send(renderEmail(payload as EmailMessage)));
}
