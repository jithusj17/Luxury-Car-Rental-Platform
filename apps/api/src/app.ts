import { randomUUID } from "node:crypto";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify from "fastify";
import { jsonSchemaTransform, serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { createContainer, type ContainerOverrides } from "./container.ts";
import { adminRoutes } from "./modules/admin/presentation/routes.ts";
import { ownerBookingRoutes } from "./modules/bookings/presentation/owner-routes.ts";
import { bookingRoutes } from "./modules/bookings/presentation/routes.ts";
import { registerAuthentication } from "./modules/identity/presentation/auth-guard.ts";
import { identityRoutes } from "./modules/identity/presentation/routes.ts";
import { httpWebhookDelivery, registerMockCheckout, type WebhookDelivery } from "./modules/payments/infrastructure/mock-provider/mock-checkout.ts";
import { paymentRoutes } from "./modules/payments/presentation/routes.ts";
import { vehicleRoutes } from "./modules/vehicles/presentation/routes.ts";
import type { Env } from "./shared/config/env.ts";
import { registerErrorHandling } from "./shared/http/error-handler.ts";
import { operationalRoutes } from "./shared/http/operational-routes.ts";
import { createRateLimiter, memoryStore, redisStore } from "./shared/http/rate-limit.ts";
import { registerSecurity } from "./shared/http/security.ts";
import { loggerOptions } from "./shared/logging/logger.ts";

export type AppOptions = ContainerOverrides & { webhookDelivery?: WebhookDelivery };

const REQUEST_ID = /^[\w-]{8,64}$/;

function trustProxy(value: string): boolean | number | string {
  if (value === "true" || value === "false") return value === "true";
  return /^\d+$/.test(value) ? Number(value) : value;
}

export async function buildApp(env: Env, options: AppOptions = {}) {
  const app = Fastify({
    logger: loggerOptions(env),
    // Fastify accepts a hop count at runtime, but its typings omit numbers.
    trustProxy: trustProxy(env.TRUST_PROXY) as boolean | string,
    bodyLimit: 1024 * 1024,
    requestTimeout: 30_000,
    // Correlation id: accept a well-formed upstream id, otherwise mint one.
    genReqId: (request) => {
      const incoming = request.headers["x-request-id"];
      return typeof incoming === "string" && REQUEST_ID.test(incoming) ? incoming : randomUUID();
    },
  });
  const container = createContainer(env, app.log, options);
  const { deps, metrics } = container;

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  registerErrorHandling(app);
  app.addHook("onSend", async (request, reply) => {
    reply.header("x-request-id", request.id);
  });
  app.addHook("onResponse", async (request, reply) => {
    const route = request.routeOptions.url;
    if (!route || route.startsWith("/health") || route === "/metrics") return;
    metrics.httpDuration.observe({ method: request.method, route, status: String(reply.statusCode) }, reply.elapsedTime / 1000);
  });
  app.addHook("onClose", () => container.close());

  await app.register(cookie);
  await app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 5, parts: 6 } });
  if (container.localStorage) {
    // Development storage: serve uploads read-only, never as anything but the stored image type.
    await app.register(fastifyStatic, {
      root: container.localStorage.rootDir,
      prefix: "/uploads/",
      index: false,
      list: false,
      setHeaders: (res) => {
        res.header("cache-control", "public, max-age=31536000, immutable");
        res.header("content-security-policy", "default-src 'none'");
        res.header("x-content-type-options", "nosniff");
      },
    });
  }
  await registerSecurity(app, env.WEB_ORIGINS);
  const limit = createRateLimiter({
    enabled: env.RATE_LIMIT_ENABLED,
    store: container.redis ? redisStore(container.redis) : memoryStore(),
  });

  if (env.API_DOCS_ENABLED) {
    await app.register(swagger, {
      openapi: { info: { title: "Car Rental API", version: "1.0.0" }, servers: [{ url: env.PUBLIC_API_URL }] },
      transform: jsonSchemaTransform,
    });
    await app.register(swaggerUi, { routePrefix: "/docs" });
  }

  const cookies = { secure: env.COOKIE_SECURE };
  registerAuthentication(app, deps.identity, cookies);
  identityRoutes(app, deps.identity, limit, cookies);
  vehicleRoutes(app, deps.vehicles, limit);
  bookingRoutes(app, deps.bookings, limit);
  ownerBookingRoutes(app, deps.bookings);
  paymentRoutes(app, deps.payments, limit);
  adminRoutes(app, deps.admin);
  if (env.PAYMENT_PROVIDER === "mock") {
    registerMockCheckout(app, {
      tx: container.tx,
      outbox: container.outbox,
      clock: container.clock,
      webhookSecret: env.PAYMENT_WEBHOOK_SECRET!,
      deliver: options.webhookDelivery ?? httpWebhookDelivery(`${env.PUBLIC_API_URL}/v1/payments/webhooks/mock`),
    });
  }
  operationalRoutes(app, {
    pingDatabase: container.database.ping,
    redis: container.redis,
    metrics,
    metricsToken: env.METRICS_TOKEN,
  });

  return { app, container };
}
