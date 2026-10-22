import {
  changePasswordBody,
  currentUser,
  forgotPasswordBody,
  loginBody,
  registerBody,
  resetPasswordBody,
  updateProfileBody,
  verifyEmailBody,
  type CurrentUser,
} from "@car-rental/contracts";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { bodyEmail, hours, minutes, type RateLimiter } from "../../../shared/http/rate-limit.ts";
import * as account from "../application/account-use-cases.ts";
import * as verification from "../application/email-verification.ts";
import type { IdentityDeps } from "../application/ports.ts";
import * as sessions from "../application/session-use-cases.ts";
import type { User } from "../domain/user.ts";
import { clearSessionCookie, requireUser, setSessionCookie, type CookieSettings } from "./auth-guard.ts";

const toDto = ({ emailVerifiedAt, ...user }: User): CurrentUser => ({ ...user, emailVerified: emailVerifiedAt !== null, createdAt: user.createdAt.toISOString() });
const clientInfo = (request: FastifyRequest) => ({ ip: request.ip, userAgent: request.headers["user-agent"]?.slice(0, 300) ?? null });
const userResponse = { 200: z.object({ user: currentUser }) };
const tags = ["Auth"];

export function identityRoutes(app: FastifyInstance, deps: IdentityDeps, limit: RateLimiter, cookies: CookieSettings) {
  const r = app.withTypeProvider<ZodTypeProvider>();
  const loginLimits = [
    limit("login-ip", { max: 30, windowMs: minutes(15) }),
    limit("login-account", { max: 8, windowMs: minutes(15), key: bodyEmail }),
  ];

  r.post("/v1/auth/register", {
    schema: { tags, body: registerBody, response: { 201: z.object({ user: currentUser }) } },
    preHandler: [limit("register-ip", { max: 10, windowMs: hours(1) })],
  }, async (request, reply) => {
    const session = await sessions.register(deps, request.body, clientInfo(request));
    setSessionCookie(reply, session.token, session.expiresAt, cookies);
    return reply.status(201).send({ user: toDto(session.user) });
  });

  r.post("/v1/auth/login", { schema: { tags, body: loginBody, response: userResponse }, preHandler: loginLimits }, async (request, reply) => {
    if (request.auth) await sessions.logout(deps, request.auth.token); // rotate: never reuse a prior session
    const session = await sessions.login(deps, request.body, clientInfo(request));
    setSessionCookie(reply, session.token, session.expiresAt, cookies);
    return { user: toDto(session.user) };
  });

  r.post("/v1/auth/logout", { schema: { tags, response: { 204: z.null() } } }, async (request, reply) => {
    if (request.auth) await sessions.logout(deps, request.auth.token);
    clearSessionCookie(reply, cookies);
    return reply.status(204).send(null);
  });

  r.get("/v1/auth/me", { schema: { tags, response: userResponse } }, async (request) => ({ user: toDto(requireUser(request).user) }));

  r.post("/v1/auth/password/forgot", {
    schema: { tags, body: forgotPasswordBody, response: { 202: z.null() } },
    preHandler: [
      limit("forgot-ip", { max: 10, windowMs: hours(1) }),
      limit("forgot-account", { max: 3, windowMs: hours(1), key: bodyEmail }),
    ],
  }, async (request, reply) => {
    await account.requestPasswordReset(deps, request.body.email);
    return reply.status(202).send(null);
  });

  r.post("/v1/auth/password/reset", {
    schema: { tags, body: resetPasswordBody, response: { 204: z.null() } },
    preHandler: [limit("reset-ip", { max: 10, windowMs: hours(1) })],
  }, async (request, reply) => {
    await account.resetPassword(deps, request.body);
    clearSessionCookie(reply, cookies);
    return reply.status(204).send(null);
  });

  r.post("/v1/auth/email/verify", {
    schema: { tags, body: verifyEmailBody, response: userResponse },
    preHandler: [limit("verify-email-ip", { max: 20, windowMs: hours(1) })],
  }, async (request) => ({ user: toDto(await verification.verifyEmail(deps, request.body.token)) }));

  r.post("/v1/me/email/verification", {
    schema: { tags, response: { 202: z.null() } },
    preHandler: [limit("verify-email-resend", { max: 3, windowMs: hours(1), key: (request) => request.auth?.user.id ?? request.ip })],
  }, async (request, reply) => {
    await verification.resendVerificationEmail(deps, requireUser(request).user.id);
    return reply.status(202).send(null);
  });

  r.post("/v1/me/password", {
    schema: { tags, body: changePasswordBody, response: { 204: z.null() } },
    preHandler: [limit("change-password", { max: 10, windowMs: hours(1) })],
  }, async (request, reply) => {
    const auth = requireUser(request);
    await account.changePassword(deps, auth.user.id, auth.sessionId, request.body);
    return reply.status(204).send(null);
  });

  r.patch("/v1/me", { schema: { tags, body: updateProfileBody, response: userResponse } }, async (request) => {
    const auth = requireUser(request);
    return { user: toDto(await account.updateProfile(deps, auth.user.id, request.body)) };
  });

  r.post("/v1/me/become-owner", { schema: { tags, response: userResponse } }, async (request) => {
    const auth = requireUser(request);
    return { user: toDto(await account.becomeOwner(deps, auth.user.id)) };
  });
}
