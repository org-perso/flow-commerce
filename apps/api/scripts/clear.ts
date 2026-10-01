/**
 * Clears test data. Three modes:
 *
 *   yarn seed:clear [--shop "Nom"]                 empties the shop (orders, products, customers,
 *                                                  expenses, stock history); keeps the shop and its
 *                                                  categories; order numbers restart at #001
 *   yarn seed:clear [--shop "Nom"] --delete-shop   deletes the shop itself too (the owner goes back
 *                                                  to shop creation if it was their only one)
 *   yarn seed:clear --all                          wipes the whole database: every user, shop and
 *                                                  data (schema and migrations kept). Firebase
 *                                                  accounts stay: users are recreated at next sign-in
 *
 * Every mode asks to type a confirmation word first.
 */
import { createInterface } from 'node:readline/promises';

import { env } from '../src/config/env.js';
import { pool, withTransaction } from '../src/db/pool.js';
import { resolveShop } from './shop-arg.js';

if (env.NODE_ENV === 'production') {
  console.error('Refusé : NODE_ENV=production.');
  process.exit(1);
}

/** Business tables of a shop, children first (foreign keys). */
const SHOP_DATA = [
  'stock_movements',
  'order_items',
  'orders',
  'customer_phones',
  'customers',
  'products',
  'expenses',
];

async function confirm(summary: string, word: string): Promise<void> {
  const host = new URL(env.DATABASE_URL).host;
  console.log(`\nBase : ${host}\n${summary}`);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`Tapez ${word} pour confirmer : `);
  rl.close();
  if (answer.trim() !== word) {
    console.log('Annulé, rien n’a été supprimé.');
    await pool.end();
    process.exit(0);
  }
}

const args = process.argv.slice(2);

if (args.includes('--all')) {
  const { rows } = await pool.query<{ users: number; shops: number }>(
    'SELECT (SELECT count(*) FROM users)::int AS users, (SELECT count(*) FROM shops)::int AS shops',
  );
  await confirm(
    `TOUT va être supprimé : ${rows[0]!.users} utilisateur(s), ${rows[0]!.shops} boutique(s) et toutes leurs données.`,
    'TOUT',
  );
  await pool.query(
    `TRUNCATE users, shops, product_categories, ${SHOP_DATA.join(', ')} RESTART IDENTITY CASCADE`,
  );
  console.log('Base vidée. Reconnectez-vous dans l’app : le compte sera recréé, puis la boutique.');
} else {
  const shop = await resolveShop();
  const deleteShop = args.includes('--delete-shop');
  await confirm(
    deleteShop
      ? `La boutique « ${shop.name} » et toutes ses données vont être supprimées.`
      : `Les données de « ${shop.name} » vont être supprimées (boutique et catégories conservées).`,
    deleteShop ? 'SUPPRIMER' : 'VIDER',
  );
  await withTransaction(async (client) => {
    for (const table of SHOP_DATA) {
      await client.query(`DELETE FROM ${table} WHERE shop_id = $1`, [shop.id]);
    }
    if (deleteShop) {
      await client.query('DELETE FROM product_categories WHERE shop_id = $1', [shop.id]);
      await client.query('DELETE FROM shops WHERE id = $1', [shop.id]);
    } else {
      await client.query('UPDATE shops SET last_order_number = 0 WHERE id = $1', [shop.id]);
    }
  });
  console.log(
    deleteShop
      ? `Boutique « ${shop.name} » supprimée.`
      : `« ${shop.name} » vidée (boutique et catégories conservées).`,
  );
}
await pool.end();
