import type { FastifyInstance } from "fastify";
import { MOCK_CARDS } from "../../src/modules/payments/infrastructure/mock-provider/mock-checkout.ts";
import { api, type Session } from "./api.ts";

export const CARDS = { ok: "4242424242424242", ...MOCK_CARDS };

/** Starts a payment and submits a card at the mock provider. Webhooks are queued in the outbox. */
export async function pay(app: FastifyInstance, session: Session, bookingId: string, card = CARDS.ok) {
  const started = await api(app).post(`/v1/bookings/${bookingId}/payments`, {}, { session });
  if (started.status >= 300) return { started, confirmed: undefined };
  const confirmed = await api(app).post("/v1/mock-provider/confirm", { clientSecret: started.body.clientSecret, cardNumber: card }, { session });
  return { started, confirmed };
}
