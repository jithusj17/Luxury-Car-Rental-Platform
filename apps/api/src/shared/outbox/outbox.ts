import { randomUUID } from "node:crypto";
import { and, eq, lt, sql } from "drizzle-orm";
import type { Clock } from "../clock.ts";
import type { TransactionManager } from "../db/transaction.ts";
import { outboxJobs } from "./schema.ts";

export type OutboxJob = { id: string; type: string; payload: unknown; attempts: number };
export type OutboxHandler = (payload: unknown, job: OutboxJob) => Promise<void>;
export type EnqueueOptions = { delayMs?: number };

const MAX_ATTEMPTS = 10;
const STUCK_AFTER_MS = 5 * 60_000;

/** Records side effects in the caller's transaction and runs them later, at least once. */
export class Outbox {
  readonly #tx: TransactionManager;
  readonly #clock: Clock;
  readonly #handlers = new Map<string, OutboxHandler>();
  #onPermanentFailure: (job: OutboxJob, error: unknown) => void = () => {};

  constructor(tx: TransactionManager, clock: Clock) {
    this.#tx = tx;
    this.#clock = clock;
  }

  register(type: string, handler: OutboxHandler): void {
    if (this.#handlers.has(type)) throw new Error(`Outbox handler already registered: ${type}`);
    this.#handlers.set(type, handler);
  }

  onPermanentFailure(listener: (job: OutboxJob, error: unknown) => void): void {
    this.#onPermanentFailure = listener;
  }

  async enqueue(type: string, payload: unknown, options: EnqueueOptions = {}): Promise<void> {
    const runAt = new Date(this.#clock.now().getTime() + (options.delayMs ?? 0));
    await this.#tx.executor().insert(outboxJobs).values({ id: randomUUID(), type, payload, runAt });
  }

  /** Claims and runs due jobs. Safe to call from several instances (SKIP LOCKED). */
  async drain(batchSize = 20): Promise<number> {
    const now = this.#clock.now();
    await this.#releaseStuck(now);
    const claimed = await this.#claim(now, batchSize);
    for (const job of claimed) await this.#run(job);
    return claimed.length;
  }

  async #claim(now: Date, limit: number): Promise<OutboxJob[]> {
    const result = await this.#tx.executor().execute<{ id: string; type: string; payload: unknown; attempts: number }>(sql`
      update outbox_jobs set status = 'RUNNING', locked_at = ${now}
      where id in (
        select id from outbox_jobs
        where status = 'PENDING' and run_at <= ${now}
        order by run_at
        limit ${limit}
        for update skip locked
      )
      returning id, type, payload, attempts`);
    return result.rows;
  }

  async #run(job: OutboxJob): Promise<void> {
    const db = this.#tx.executor();
    const handler = this.#handlers.get(job.type);
    try {
      if (!handler) throw new Error(`No outbox handler for ${job.type}`);
      await handler(job.payload, job);
      await db
        .update(outboxJobs)
        .set({ status: "DONE", completedAt: this.#clock.now(), lockedAt: null })
        .where(eq(outboxJobs.id, job.id));
    } catch (error) {
      const attempts = job.attempts + 1;
      const failed = attempts >= MAX_ATTEMPTS;
      const backoffMs = Math.min(2 ** attempts * 1000, 60 * 60_000);
      await db
        .update(outboxJobs)
        .set({
          status: failed ? "FAILED" : "PENDING",
          attempts,
          lockedAt: null,
          lastError: error instanceof Error ? error.message.slice(0, 1000) : String(error),
          runAt: new Date(this.#clock.now().getTime() + backoffMs),
        })
        .where(eq(outboxJobs.id, job.id));
      if (failed) this.#onPermanentFailure(job, error);
    }
  }

  /** A worker that crashed mid-job leaves it RUNNING; hand it back to the queue. */
  async #releaseStuck(now: Date): Promise<void> {
    await this.#tx
      .executor()
      .update(outboxJobs)
      .set({ status: "PENDING", lockedAt: null })
      .where(and(eq(outboxJobs.status, "RUNNING"), lt(outboxJobs.lockedAt, new Date(now.getTime() - STUCK_AFTER_MS))));
  }
}
