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

    /** `log` writes emails to the log (development); `smtp` sends them. */
    EMAIL_TRANSPORT: z.enum(["log", "smtp"]).default("log"),
    /** e.g. smtps://user:pass@smtp.example.com:465 (Resend, SendGrid, SES and most providers offer SMTP). */
    SMTP_URL: z.url().optional(),
    EMAIL_FROM: z.string().min(3).default("Car Rental <no-reply@carrental.local>"),

    /** Vehicle photos: `local` disk (development) or any S3-compatible bucket (production). */
    STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
    LOCAL_STORAGE_DIR: z.string().default("./uploads"),
    /** Public base URL of stored files; defaults to the API's /uploads route for local storage. */
    STORAGE_PUBLIC_URL: z.url().optional(),
    S3_BUCKET: z.string().optional(),
    S3_REGION: z.string().default("auto"),
    /** Set for non-AWS providers, e.g. Cloudflare R2 or MinIO. */
    S3_ENDPOINT: z.url().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_FORCE_PATH_STYLE: bool.default(false),

    JOBS_ENABLED: bool.default(true),
    RATE_LIMIT_ENABLED: bool.default(true),
    API_DOCS_ENABLED: bool.optional(),
    /** Bearer token for /metrics; metrics are open when unset (non-production only). */
    METRICS_TOKEN: z.string().min(16).optional(),
  })
  .superRefine((env, ctx) => {
    if (env.EMAIL_TRANSPORT === "smtp" && !env.SMTP_URL) {
      ctx.addIssue({ code: "custom", path: ["SMTP_URL"], message: "Required when EMAIL_TRANSPORT=smtp" });
    }
    if (env.STORAGE_DRIVER === "s3") {
      for (const key of ["S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "STORAGE_PUBLIC_URL"] as const) {
        if (!env[key]) ctx.addIssue({ code: "custom", path: [key], message: "Required when STORAGE_DRIVER=s3" });
      }
    }
    if (env.NODE_ENV !== "production") return;
    if (env.STORAGE_DRIVER !== "s3") {
      ctx.addIssue({ code: "custom", path: ["STORAGE_DRIVER"], message: "Production needs shared storage (s3); local disk isn't shared between instances" });
    }
    if (env.EMAIL_TRANSPORT !== "smtp") {
      ctx.addIssue({ code: "custom", path: ["EMAIL_TRANSPORT"], message: "Production must send real email (smtp)" });
    }
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
