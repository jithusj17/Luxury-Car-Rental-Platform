import "@fastify/cookie";
import type { UserRole } from "@car-rental/contracts";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { errors } from "../../../shared/errors/app-error.ts";
import { authenticate } from "../application/session-use-cases.ts";
import type { IdentityDeps } from "../application/ports.ts";
import { hasRole, type User } from "../domain/user.ts";

export const SESSION_COOKIE = "cr_session";

export type RequestAuth = { user: User; sessionId: string; token: string };

declare module "fastify" {
  interface FastifyRequest {
    auth: RequestAuth | null;
  }
}

export type CookieSettings = { secure: boolean };

export function setSessionCookie(reply: FastifyReply, token: string, expires: Date, settings: CookieSettings): void {
  reply.setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: settings.secure,
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export function clearSessionCookie(reply: FastifyReply, settings: CookieSettings): void {
  reply.clearCookie(SESSION_COOKIE, { httpOnly: true, secure: settings.secure, sameSite: "lax", path: "/" });
}

/** Resolves the session cookie (if any) to `request.auth` for every request. */
export function registerAuthentication(app: FastifyInstance, deps: IdentityDeps, cookies: CookieSettings): void {
  app.decorateRequest("auth", null);
  app.addHook("onRequest", async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE];
    if (!token) return;
    const session = await authenticate(deps, token);
    if (!session) {
      clearSessionCookie(reply, cookies);
      return;
    }
    request.auth = { user: session.user, sessionId: session.sessionId, token };
    if (session.refreshedExpiresAt) setSessionCookie(reply, token, session.refreshedExpiresAt, cookies);
  });
}

/** Authentication check for handlers; authorization of resources happens in use cases. */
export function requireUser(request: FastifyRequest): RequestAuth {
  if (!request.auth) throw errors.unauthenticated();
  return request.auth;
}

export function requireRole(request: FastifyRequest, role: UserRole): RequestAuth {
  const auth = requireUser(request);
  if (!hasRole(auth.user, role)) throw errors.forbidden();
  return auth;
}
