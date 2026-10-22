import { randomBytes } from "node:crypto";
import { mockConfirmBody } from "@car-rental/contracts";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import type { Clock } from "../../../../shared/clock.ts";
import type { TransactionManager } from "../../../../shared/db/transaction.ts";
import { errors } from "../../../../shared/errors/app-error.ts";
import type { Outbox } from "../../../../shared/outbox/outbox.ts";
import type { ProviderEvent } from "../../application/ports.ts";
import { mockProviderPayments } from "./schema.ts";
import { SIGNATURE_HEADER, signPayload } from "./signature.ts";

export const MOCK_WEBHOOK_JOB = "mock-provider.deliver-webhook";

/** Test cards, mirroring common provider conventions. */
export const MOCK_CARDS = {
  declined: "4000000000000002",
  insufficientFunds: "4000000000009995",
  /** Succeeds at the provider but the webhook is never sent — exercises reconciliation. */
  lostWebhook: "4000000000000259",
};

export type WebhookDelivery = (body: string, headers: Record<string, string>) => Promise<void>;

/**
 * The provider's hosted card step. In production this is the provider's own UI/SDK;
 * here the checkout page posts the client secret and a test card number.
 */
export function registerMockCheckout(
  app: FastifyInstance,
  deps: { tx: TransactionManager; outbox: Outbox; clock: Clock; webhookSecret: string; deliver: WebhookDelivery },
) {
  deps.outbox.register(MOCK_WEBHOOK_JOB, async (payload) => {
    const body = JSON.stringify(payload as ProviderEvent);
    await deps.deliver(body, { "content-type": "application/json", [SIGNATURE_HEADER]: signPayload(deps.webhookSecret, body, deps.clock.now()) });
  });

  app.withTypeProvider<ZodTypeProvider>().post("/v1/mock-provider/confirm", {
    schema: { tags: ["Mock payment provider"], body: mockConfirmBody, response: { 200: z.object({ status: z.string() }) } },
  }, async (request) => {
    const { clientSecret, cardNumber } = request.body;
    const failureReason =
      cardNumber === MOCK_CARDS.declined ? "card_declined" : cardNumber === MOCK_CARDS.insufficientFunds ? "insufficient_funds" : null;
    const status = failureReason ? "failed" : "succeeded";

    return deps.tx.run(async () => {
      const [row] = await deps.tx
        .executor()
        .update(mockProviderPayments)
        .set({ status, failureReason })
        .where(and(eq(mockProviderPayments.clientSecret, clientSecret), eq(mockProviderPayments.status, "requires_action")))
        .returning({ id: mockProviderPayments.id });
      if (!row) throw errors.conflict("This payment can no longer be completed");

      if (cardNumber !== MOCK_CARDS.lostWebhook) {
        const event: ProviderEvent = {
          id: `mock_evt_${randomBytes(12).toString("hex")}`,
          type: failureReason ? "payment.failed" : "payment.succeeded",
          providerPaymentId: row.id,
          ...(failureReason && { failureReason }),
        };
        await deps.outbox.enqueue(MOCK_WEBHOOK_JOB, event);
      }
      return { status };
    });
  });
}

/** Default delivery: HTTP POST to our own webhook endpoint, like a real provider would. */
export function httpWebhookDelivery(url: string): WebhookDelivery {
  return async (body, headers) => {
    const response = await fetch(url, { method: "POST", body, headers, signal: AbortSignal.timeout(5_000) });
    if (!response.ok) throw new Error(`Webhook delivery failed with HTTP ${response.status}`);
  };
}
