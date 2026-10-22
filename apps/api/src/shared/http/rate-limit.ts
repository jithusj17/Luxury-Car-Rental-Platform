import type { FastifyRequest, preHandlerAsyncHookHandler } from "fastify";
import type { Redis } from "ioredis";
import { AppError, errors } from "../errors/app-error.ts";

export type RateLimitRule = {
  max: number;
  windowMs: number;
  /** Limit key, e.g. the account being logged into or the user id. Defaults to client IP. */
  key?: (request: FastifyRequest) => string;
  /**
   * Behaviour when the shared store (Redis) is unreachable. Abuse-sensitive routes fail closed (503);
   * read-only routes fail open so a Redis outage does not take search down.
   */
  failOpen?: boolean;
};

export type RateLimiter = (name: string, rule: RateLimitRule) => preHandlerAsyncHookHandler;

/** Fixed-window counter. */
export interface RateLimitStore {
  hit(key: string, windowMs: number): Promise<{ count: number; resetMs: number }>;
}

export function memoryStore(): RateLimitStore {
  const windows = new Map<string, { count: number; resetAt: number }>();
  let lastSweep = Date.now();
  return {
    async hit(key, windowMs) {
      const now = Date.now();
      if (now - lastSweep > 60_000) {
        for (const [k, w] of windows) if (w.resetAt <= now) windows.delete(k);
        lastSweep = now;
      }
      const current = windows.get(key);
      const window = current && current.resetAt > now ? current : { count: 0, resetAt: now + windowMs };
      window.count += 1;
      windows.set(key, window);
      return { count: window.count, resetMs: window.resetAt - now };
    },
  };
}

/** Shared across instances. `PEXPIRE … NX` sets the window only on the first hit (Redis ≥ 7). */
export function redisStore(redis: Redis): RateLimitStore {
  return {
    async hit(key, windowMs) {
      const results = await redis.multi().incr(key).pexpire(key, windowMs, "NX").pttl(key).exec();
      if (!results || results.some(([error]) => error)) throw new Error("Rate limit store error");
      return { count: Number(results[0]![1]), resetMs: Math.max(Number(results[2]![1]), 0) };
    },
  };
}

/**
 * Per-route limits; several can be stacked on one route (e.g. per IP *and* per account).
 * Exceeding a limit yields 429 with Retry-After.
 */
export function createRateLimiter(options: { enabled: boolean; store: RateLimitStore }): RateLimiter {
  if (!options.enabled) return () => async () => {};

  return (name, rule) => async (request, reply) => {
    const key = `car-rental:rl:${name}:${rule.key ? rule.key(request) : request.ip}`;
    let result: { count: number; resetMs: number };
    try {
      result = await options.store.hit(key, rule.windowMs);
    } catch (error) {
      request.log.warn({ err: error, limiter: name }, "Rate limit store unavailable");
      if (rule.failOpen) return;
      throw errors.unavailable();
    }
    const resetSeconds = Math.ceil(result.resetMs / 1000);
    reply.header("x-ratelimit-limit", rule.max);
    reply.header("x-ratelimit-remaining", Math.max(rule.max - result.count, 0));
    reply.header("x-ratelimit-reset", resetSeconds);
    if (result.count > rule.max) {
      reply.header("retry-after", resetSeconds);
      throw new AppError("RATE_LIMITED", "Too many requests, please try again later");
    }
  };
}

export const minutes = (n: number) => n * 60_000;
export const hours = (n: number) => n * 3_600_000;

/** Normalised email from a JSON body, for per-account limits. */
export function bodyEmail(request: FastifyRequest): string {
  const body = request.body as { email?: unknown } | undefined;
  return typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
}
