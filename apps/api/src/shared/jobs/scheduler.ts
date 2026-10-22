import type { FastifyBaseLogger } from "fastify";

type Job = { name: string; intervalMs: number; run: () => Promise<unknown> };

/**
 * Minimal in-process interval scheduler. Every job is idempotent and safe to run on several
 * instances at once (row locks / conditional updates), so no leader election is needed.
 */
export class Scheduler {
  readonly #jobs: Job[] = [];
  readonly #timers: NodeJS.Timeout[] = [];
  readonly #running = new Set<Promise<unknown>>();
  readonly #logger: FastifyBaseLogger;

  constructor(logger: FastifyBaseLogger) {
    this.#logger = logger;
  }

  every(name: string, intervalMs: number, run: () => Promise<unknown>): this {
    this.#jobs.push({ name, intervalMs, run });
    return this;
  }

  start(): void {
    for (const job of this.#jobs) {
      let busy = false;
      const tick = () => {
        if (busy) return; // never overlap a slow run with the next tick
        busy = true;
        const run = job
          .run()
          .catch((error: unknown) => this.#logger.error({ err: error, job: job.name }, "Scheduled job failed"))
          .finally(() => {
            busy = false;
            this.#running.delete(run);
          });
        this.#running.add(run);
      };
      this.#timers.push(setInterval(tick, job.intervalMs));
    }
  }

  /** Stops scheduling and waits for in-flight runs (graceful shutdown). */
  async stop(): Promise<void> {
    for (const timer of this.#timers) clearInterval(timer);
    await Promise.allSettled([...this.#running]);
  }
}
