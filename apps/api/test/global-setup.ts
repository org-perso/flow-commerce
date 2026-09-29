import { execFileSync } from 'node:child_process';

import pg from 'pg';

/** Recreates the test schema from the migrations before the test run. */
export default async function setup() {
  const databaseUrl =
    process.env.TEST_DATABASE_URL ??
    'postgres://flowcommerce:flowcommerce@localhost:5432/flowcommerce_test';

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await client.end();

  execFileSync(
    'node_modules/.bin/node-pg-migrate',
    ['up', '-m', 'migrations', '--migration-file-language', 'sql'],
    { env: { ...process.env, DATABASE_URL: databaseUrl }, stdio: 'pipe' },
  );
}
