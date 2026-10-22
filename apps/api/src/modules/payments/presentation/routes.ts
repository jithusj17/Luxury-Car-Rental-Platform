import { idParams, payment as paymentSchema, type Payment as PaymentDto } from "@car-rental/contracts";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { hours, minutes, type RateLimiter } from "../../../shared/http/rate-limit.ts";
import { requireUser } from "../../identity/presentation/auth-guard.ts";
import { handleWebhook } from "../application/payment-events.ts";
import type { PaymentDeps } from "../application/ports.ts";
import { startPayment } from "../application/start-payment.ts";
import type { Payment } from "../domain/payment.ts";

const toDto = (p: Payment): PaymentDto => ({
  id: p.id,
  bookingId: p.bookingId,
  status: p.status,
  amountCents: p.amountCents,
  refundedCents: p.refundedCents,
  currency: p.currency,
  provider: p.provider,
  clientSecret: p.status === "REQUIRES_ACTION" ? p.clientSecret : null,
  failureReason: p.failureReason,
  createdAt: p.createdAt.toISOString(),
});

export function paymentRoutes(app: FastifyInstance, deps: PaymentDeps, limit: RateLimiter) {
  app.withTypeProvider<ZodTypeProvider>().post("/v1/bookings/:id/payments", {
    schema: { tags: ["Payments"], params: idParams, response: { 200: paymentSchema, 201: paymentSchema } },
    preHandler: [limit("payment-start", { max: 20, windowMs: hours(1), key: (request) => request.auth?.user.id ?? request.ip })],
  }, async (request, reply) => {
    const { user } = requireUser(request);
    const { payment, created } = await startPayment(deps, user, request.params.id);
    return reply.status(created ? 201 : 200).send(toDto(payment));
  });

  // Webhooks: authenticated by signature over the exact raw body, so parse JSON as a string here.
  app.register(async (webhooks) => {
    webhooks.addContentTypeParser("application/json", { parseAs: "string", bodyLimit: 64 * 1024 }, (_request, body, done) => {
      done(null, body);
    });
    webhooks.withTypeProvider<ZodTypeProvider>().post("/v1/payments/webhooks/:provider", {
      config: { skipOriginCheck: true },
      schema: { tags: ["Payments"], params: z.object({ provider: z.string().max(20) }), response: { 200: z.object({ received: z.boolean() }) } },
      preHandler: [limit("webhooks", { max: 600, windowMs: minutes(1), failOpen: true })],
    }, async (request) => {
      if (request.params.provider !== deps.provider.name) return { received: false };
      const processed = await handleWebhook(deps, request.body as string, request.headers);
      return { received: processed };
    });
  });
}
