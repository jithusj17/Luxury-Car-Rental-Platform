import type { FastifyServerOptions } from "fastify";
import type { Env } from "../config/env.ts";

/** Never log credentials, session tokens, or payment secrets. */
const redactPaths = [
  "req.headers.authorization",
  "req.headers.cookie",
  'res.headers["set-cookie"]',
  "*.password",
  "*.currentPassword",
  "*.newPassword",
  "*.token",
  "*.clientSecret",
  "*.cardNumber",
  "*.passwordHash",
];

export function loggerOptions(env: Env): FastifyServerOptions["logger"] {
  if (env.NODE_ENV === "test") return { level: env.LOG_LEVEL === "info" ? "silent" : env.LOG_LEVEL };
  return {
    level: env.LOG_LEVEL,
    redact: { paths: redactPaths, censor: "[redacted]" },
    ...(env.NODE_ENV === "development" && {
      transport: { target: "pino-pretty", options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" } },
    }),
  };
}
