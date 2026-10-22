import { z } from "zod";

const bool = z
  .enum(["true", "false", "1", "0"])
  .transform((v) => v === "true" || v === "1");

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    HOST: z.string().default("0.0.0.0"),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),

    DATABASE_URL: z.url(),
    DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
    DATABASE_STATEMENT_TIMEOUT_MS: z.coerce.number().int().min(100).default(10_000),
    REDIS_URL: z.url().optional(),

    /** Comma-separated list of browser origins allowed to call mutating endpoints. */
    WEB_ORIGINS: z
      .string()
      .default("http://localhost:3000")
      .transform((v) => v.split(",").map((o) => o.trim()).filter(Boolean)),
    /** Fastify `trustProxy`: hop count or comma-separated proxy addresses. */
    TRUST_PROXY: z.string().default("loopback"),
    COOKIE_SECURE: bool.optional(),
    SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(14),

    BOOKING_HOLD_MINUTES: z.coerce.number().int().min(1).max(60).default(15),
    PAYMENT_PROVIDER: z.enum(["mock"]).default("mock"),
    PAYMENT_WEBHOOK_SECRET: z.string().min(16),
    /** Base URL the payment provider uses to reach our webhooks. */
    PUBLIC_API_URL: z.url().default("http://localhost:4000"),

    JOBS_ENABLED: bool.default(true),
    RATE_LIMIT_ENABLED: bool.default(true),
    API_DOCS_ENABLED: bool.optional(),
    /** Bearer token for /metrics; metrics are open when unset (non-production only). */
    METRICS_TOKEN: z.string().min(16).optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== "production") return;
    if (env.PAYMENT_PROVIDER === "mock") {
      ctx.addIssue({ code: "custom", path: ["PAYMENT_PROVIDER"], message: "The mock payment provider cannot run in production" });
    }
    if (!env.METRICS_TOKEN) {
      ctx.addIssue({ code: "custom", path: ["METRICS_TOKEN"], message: "Required in production" });
    }
  });

export type Env = z.infer<typeof envSchema> & {
  COOKIE_SECURE: boolean;
  API_DOCS_ENABLED: boolean;
};

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  const env = parsed.data;
  const isProd = env.NODE_ENV === "production";
  return {
    ...env,
    COOKIE_SECURE: env.COOKIE_SECURE ?? isProd,
    API_DOCS_ENABLED: env.API_DOCS_ENABLED ?? !isProd,
  };
}
