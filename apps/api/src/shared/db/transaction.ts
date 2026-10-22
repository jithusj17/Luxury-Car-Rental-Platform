import { AsyncLocalStorage } from "node:async_hooks";
import type { NodePgDatabase, NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import type { PgDatabase } from "drizzle-orm/pg-core";

/** Either the pooled database or an open transaction — both expose the query builder. */
export type DbExecutor = PgDatabase<NodePgQueryResultHKT>;

/**
 * Unit of work shared across modules. Repositories call `executor()` and automatically join the
 * caller's transaction, so a use case can make several repositories (even in different modules)
 * commit or roll back together without passing transaction objects through every signature.
 */
export class TransactionManager {
  readonly #db: NodePgDatabase;
  readonly #storage = new AsyncLocalStorage<DbExecutor>();

  constructor(db: NodePgDatabase) {
    this.#db = db;
  }

  executor(): DbExecutor {
    return this.#storage.getStore() ?? this.#db;
  }

  get inTransaction(): boolean {
    return this.#storage.getStore() !== undefined;
  }

  /**
   * Runs `work` in a transaction. Nested calls create a SAVEPOINT, so a failed inner step
   * (e.g. an expected constraint violation) can be handled without aborting the outer transaction.
   */
  run<T>(work: () => Promise<T>): Promise<T> {
    const parent = this.#storage.getStore() ?? this.#db;
    return parent.transaction((tx) => this.#storage.run(tx, work));
  }
}
