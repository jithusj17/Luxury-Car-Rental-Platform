import { describe, expect, it } from "vitest";
import { signPayload, verifySignature } from "../infrastructure/mock-provider/signature.ts";
import { canTransition, refundAmount } from "./payment.ts";

describe("payment rules", () => {
  it("never refunds more than what is left", () => {
    expect(refundAmount({ amountCents: 10_000, refundedCents: 0 }, 50)).toBe(5_000);
    expect(refundAmount({ amountCents: 10_000, refundedCents: 7_000 }, 50)).toBe(3_000);
    expect(refundAmount({ amountCents: 10_000, refundedCents: 10_000 }, 100)).toBe(0);
  });

  it("lets the provider's capture win over our local failure or cancellation", () => {
    expect(canTransition("FAILED", "SUCCEEDED")).toBe(true);
    expect(canTransition("CANCELLED", "SUCCEEDED")).toBe(true);
    expect(canTransition("SUCCEEDED", "FAILED")).toBe(false);
  });
});

describe("webhook signatures", () => {
  const secret = "secret-0123456789abcdef";
  const body = JSON.stringify({ id: "evt_1" });
  const at = new Date("2030-01-10T09:00:00Z");

  it("accepts a fresh, matching signature", () => {
    expect(() => verifySignature(secret, body, signPayload(secret, body, at), at)).not.toThrow();
  });

  it("rejects tampered bodies, wrong secrets and replays outside the tolerance", () => {
    const header = signPayload(secret, body, at);
    expect(() => verifySignature(secret, `${body} `, header, at)).toThrow(/mismatch/);
    expect(() => verifySignature("another-secret-012345", body, header, at)).toThrow(/mismatch/);
    expect(() => verifySignature(secret, body, header, new Date(at.getTime() + 10 * 60_000))).toThrow(/tolerance/);
    expect(() => verifySignature(secret, body, undefined, at)).toThrow(/Malformed/);
  });
});
