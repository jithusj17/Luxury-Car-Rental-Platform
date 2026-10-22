import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import type { FastifyInstance } from "fastify";
import { errors } from "../errors/app-error.ts";

declare module "fastify" {
  interface FastifyContextConfig {
    /** Server-to-server endpoints (payment webhooks) authenticate by signature instead. */
    skipOriginCheck?: boolean;
  }
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export async function registerSecurity(app: FastifyInstance, allowedOrigins: string[]): Promise<void> {
  // JSON API: no HTML is served, so CSP adds nothing; the remaining helmet headers still apply.
  await app.register(helmet, { contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: "same-site" } });
  await app.register(cors, { origin: allowedOrigins, credentials: true, maxAge: 600 });

  /**
   * CSRF defence for cookie-authenticated requests: browsers always send `Origin` on
   * cross-site and same-site POST/PUT/PATCH/DELETE, so a state change must come from a trusted origin.
   * Combined with SameSite=Lax session cookies.
   */
  app.addHook("onRequest", async (request) => {
    if (SAFE_METHODS.has(request.method) || request.routeOptions.config.skipOriginCheck) return;
    const origin = request.headers.origin;
    if (!origin || !allowedOrigins.includes(origin)) {
      throw errors.forbidden("Request origin not allowed");
    }
  });
}
