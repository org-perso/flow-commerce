import type pg from 'pg';

import { withTransaction } from '../../db/pool.js';
import { deleteMember } from '../team/team.service.js';

/** Tables of a shop, children first (foreign keys). */
const SHOP_TABLES = [
  'stock_movements',
  'order_items',
  'orders',
  'customer_phones',
  'customers',
  'products',
  'product_categories',
  'expenses',
  'shop_invitations',
  'shop_members',
];

async function deleteShop(client: pg.PoolClient, shopId: string): Promise<string[]> {
  const { rows } = await client.query<{ image: string }>(
    'SELECT image FROM products WHERE shop_id = $1 AND image IS NOT NULL',
    [shopId],
  );
  for (const table of SHOP_TABLES) {
    await client.query(`DELETE FROM ${table} WHERE shop_id = $1`, [shopId]);
  }
  await client.query('DELETE FROM shops WHERE id = $1', [shopId]);
  return rows.map((r) => r.image);
}

/**
 * Account deletion (Play Store requirement). Shops where the user is the only owner are deleted
 * with all their data, team included; elsewhere the user just leaves (open deliveries go back
 * to "à prendre"), and a shop they created passes to another owner.
 * Returns the photo URLs of the deleted shops: the app removes them from Firebase Storage.
 */
export function deleteAccount(userId: string): Promise<{ images: string[] }> {
  return withTransaction(async (client) => {
    const { rows: memberships } = await client.query<{ shopId: string; soleOwner: boolean }>(
      `SELECT m.shop_id AS "shopId",
              m.role = 'OWNER' AND NOT EXISTS (
                SELECT 1 FROM shop_members o
                WHERE o.shop_id = m.shop_id AND o.role = 'OWNER' AND o.user_id <> m.user_id
              ) AS "soleOwner"
       FROM shop_members m WHERE m.user_id = $1
       ORDER BY m.shop_id
       FOR UPDATE OF m`,
      [userId],
    );

    const images: string[] = [];
    for (const { shopId, soleOwner } of memberships) {
      if (soleOwner) {
        images.push(...(await deleteShop(client, shopId)));
        continue;
      }
      await deleteMember(client, shopId, userId);
      await client.query(
        `UPDATE shops SET owner_id = (
           SELECT user_id FROM shop_members
           WHERE shop_id = $1 AND role = 'OWNER' ORDER BY created_at LIMIT 1)
         WHERE id = $1 AND owner_id = $2`,
        [shopId, userId],
      );
    }

    // Traces left in other shops' invitations.
    await client.query('UPDATE shop_invitations SET used_by = NULL WHERE used_by = $1', [userId]);
    await client.query('DELETE FROM shop_invitations WHERE created_by = $1', [userId]);
    // Push tokens go with the user (ON DELETE CASCADE).
    await client.query('DELETE FROM users WHERE id = $1', [userId]);
    return { images };
  });
}
