/**
 * Empties one shop's business data (orders, products, customers, expenses, stock history)
 * and restarts order numbers at #001. Keeps the user, the shop and its categories.
 *
 *   yarn seed:clear                 (the only shop in the database)
 *   yarn seed:clear --shop "Glow UP"
 */
import { env } from '../src/config/env.js';
import { pool, withTransaction } from '../src/db/pool.js';
import { resolveShop } from './shop-arg.js';

if (env.NODE_ENV === 'production') {
  console.error('Refusé : NODE_ENV=production.');
  process.exit(1);
}

const shop = await resolveShop();
await withTransaction(async (client) => {
  for (const table of [
    'stock_movements',
    'order_items',
    'orders',
    'customer_phones',
    'customers',
    'products',
    'expenses',
  ]) {
    await client.query(`DELETE FROM ${table} WHERE shop_id = $1`, [shop.id]);
  }
  await client.query('UPDATE shops SET last_order_number = 0 WHERE id = $1', [shop.id]);
});
console.log(`« ${shop.name} » vidée (boutique et catégories conservées).`);
await pool.end();
