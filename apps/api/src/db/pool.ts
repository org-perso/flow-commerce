import pg from 'pg';

import { env } from '../config/env.js';

// Return BIGINT (amounts in Ariary) as JS numbers instead of strings.
// Safe: amounts stay far below Number.MAX_SAFE_INTEGER (9e15 Ar).
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => Number(value));

export const pool = new pg.Pool({ connectionString: env.DATABASE_URL });

/** The pool, or a client inside a transaction. Repositories accept either. */
export type Db = pg.Pool | pg.PoolClient;

/** Runs `fn` in a transaction; rolls back if it throws. */
export async function withTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
