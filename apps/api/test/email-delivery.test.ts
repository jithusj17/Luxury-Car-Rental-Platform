import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { renderEmail } from "../src/modules/notifications/application/templates.ts";
import { createSmtpEmailSender } from "../src/modules/notifications/infrastructure/email-delivery.ts";

/** Real SMTP delivery against Mailpit (docker compose / CI service). */
const MAILPIT_SMTP = process.env.TEST_SMTP_URL ?? "smtp://localhost:1025";
const MAILPIT_API = process.env.TEST_MAILPIT_API ?? "http://localhost:8025/api/v1";

describe("email rendering", () => {
  it("escapes user content in the HTML version and turns links into buttons", () => {
    const email = renderEmail({
      template: "password-reset",
      to: "a@example.com",
      data: { name: "<script>alert(1)</script>", resetUrl: "https://app.example.com/reset-password?token=abc" },
    });
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).toContain('href="https://app.example.com/reset-password?token=abc"');
    expect(email.text).toContain("https://app.example.com/reset-password?token=abc");
  });
});

describe("SMTP delivery", () => {
  it("delivers a multipart (text + HTML) email", async () => {
    const to = `smtp-${randomUUID()}@example.com`;
    const sender = createSmtpEmailSender(MAILPIT_SMTP, "Car Rental <no-reply@carrental.local>");
    await sender.send(renderEmail({ template: "welcome", to, data: { name: "Mia", verifyUrl: "http://localhost:3000/verify-email?token=abc" } }));

    type Search = { messages_count: number; messages: { ID: string }[] };
    type Message = { Subject: string; From: { Address: string }; Text: string; HTML: string };
    const search = (await fetch(`${MAILPIT_API}/search?query=${encodeURIComponent(`to:${to}`)}`).then((r) => r.json())) as Search;
    expect(search.messages_count).toBe(1);
    const message = (await fetch(`${MAILPIT_API}/message/${search.messages[0]!.ID}`).then((r) => r.json())) as Message;
    expect(message.Subject).toBe("Welcome to Car Rental: please confirm your email");
    expect(message.From.Address).toBe("no-reply@carrental.local");
    expect(message.Text).toContain("Hi Mia");
    expect(message.HTML).toContain("Welcome to Car Rental");
  });
});
