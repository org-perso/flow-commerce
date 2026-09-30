import { pool } from '../src/db/pool.js';

/**
 * The shop to work on: `--shop <id or name>`, or the only shop in the database.
 * Exits with the list of shops when it is ambiguous.
 */
export async function resolveShop(): Promise<{ id: string; name: string }> {
  const index = process.argv.indexOf('--shop');
  const wanted = index > -1 ? process.argv[index + 1] : undefined;
  const { rows } = await pool.query<{ id: string; name: string; email: string | null }>(
    `SELECT s.id, s.name, u.email FROM shops s JOIN users u ON u.id = s.owner_id
     ORDER BY s.created_at`,
  );
  const matches = wanted
    ? rows.filter((s) => s.id === wanted || s.name.toLowerCase() === wanted.toLowerCase())
    : rows;
  if (matches.length === 1) return matches[0]!;

  console.error(
    rows.length === 0
      ? 'Aucune boutique : créez-en une dans l’app d’abord.'
      : `Précisez la boutique avec --shop <id ou nom> :\n${rows
          .map((s) => `  ${s.id}  ${s.name}  (${s.email ?? 'sans email'})`)
          .join('\n')}`,
  );
  await pool.end();
  process.exit(1);
}
