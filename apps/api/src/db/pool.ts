import pg from 'pg';

import { env } from '../config/env.js';

// Return BIGINT (amounts in Ariary) as JS numbers instead of strings.
// Safe: amounts stay far below Number.MAX_SAFE_INTEGER (9e15 Ar).
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => Number(value));

export const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
