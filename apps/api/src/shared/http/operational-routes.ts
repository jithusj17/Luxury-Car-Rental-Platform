import type { FastifyInstance } from "fastify";
import type { Redis } from "ioredis";
import type { Metrics } from "../observability/metrics.ts";

type Probe = { name: string; check: () => Promise<unknown> };

const withTimeout = <T>(promise: Promise<T>, ms: number) =>
  Promise.race([promise, new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);

/** Liveness, readiness, and Prometheus metrics. Excluded from request-duration metrics. */
export function operationalRoutes(
  app: FastifyInstance,
  options: { pingDatabase: () => Promise<void>; redis?: Redis; metrics: Metrics; metricsToken?: string },
) {
  const probes: Probe[] = [{ name: "database", check: options.pingDatabase }];
  if (options.redis) probes.push({ name: "redis", check: () => options.redis!.ping() });

  app.get("/health/live", { logLevel: "warn" }, async () => ({ status: "ok" }));

  app.get("/health/ready", { logLevel: "warn" }, async (_request, reply) => {
    const results = await Promise.all(
      probes.map(async (p) => {
        try {
          await withTimeout(p.check(), 2_000);
          return [p.name, "ok"] as const;
        } catch {
          return [p.name, "fail"] as const;
        }
      }),
    );
    const ready = results.every(([, status]) => status === "ok");
    return reply.status(ready ? 200 : 503).send({ status: ready ? "ok" : "unavailable", checks: Object.fromEntries(results) });
  });

  app.get("/metrics", { logLevel: "warn" }, async (request, reply) => {
    if (options.metricsToken && request.headers.authorization !== `Bearer ${options.metricsToken}`) {
      return reply.status(401).send({ error: { code: "UNAUTHENTICATED", message: "Metrics token required" } });
    }
    return reply.type(options.metrics.registry.contentType).send(await options.metrics.registry.metrics());
  });
}
