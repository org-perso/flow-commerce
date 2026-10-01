import { pool, withTransaction } from '../../db/pool.js';
import { seedDefaultCategories } from '../category/category.repository.js';
import type { Role } from './permissions.js';

export type Shop = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/** A shop as listed for a user: with their role in it. */
export type ShopWithRole = Shop & { role: Role };

export type Member = { userId: string; role: Role };

export type ShopInput = {
  name: string;
  description: string | null;
};

const columns = `id, name, description, created_at AS "createdAt", updated_at AS "updatedAt"`;
const shopColumns = `s.id, s.name, s.description, s.created_at AS "createdAt",
  s.updated_at AS "updatedAt"`;

/** Shops the user is a member of, with their role. */
export async function listShopsForUser(userId: string): Promise<ShopWithRole[]> {
  const { rows } = await pool.query<ShopWithRole>(
    `SELECT ${shopColumns}, m.role
     FROM shops s JOIN shop_members m ON m.shop_id = s.id
     WHERE m.user_id = $1 ORDER BY s.created_at`,
    [userId],
  );
  return rows;
}

/** Membership is part of the lookup: a shop the user is not a member of is simply not found. */
export async function findShopForMember(
  shopId: string,
  userId: string,
): Promise<{ shop: Shop; role: Role } | null> {
  const { rows } = await pool.query<Shop & { role: Role }>(
    `SELECT ${shopColumns}, m.role
     FROM shops s JOIN shop_members m ON m.shop_id = s.id
     WHERE s.id = $1 AND m.user_id = $2`,
    [shopId, userId],
  );
  if (!rows[0]) return null;
  const { role, ...shop } = rows[0];
  return { shop, role };
}

/** Creates the shop with its standard product categories; the creator is its owner. */
export function createShop(ownerId: string, input: ShopInput): Promise<ShopWithRole> {
  return withTransaction(async (client) => {
    const { rows } = await client.query<Shop>(
      `INSERT INTO shops (owner_id, name, description) VALUES ($1, $2, $3) RETURNING ${columns}`,
      [ownerId, input.name, input.description],
    );
    const shop = rows[0]!;
    await client.query(
      `INSERT INTO shop_members (shop_id, user_id, role) VALUES ($1, $2, 'OWNER')`,
      [shop.id, ownerId],
    );
    await seedDefaultCategories(client, shop.id);
    return { ...shop, role: 'OWNER' };
  });
}

export async function updateShop(shopId: string, patch: Partial<ShopInput>): Promise<Shop> {
  const { rows } = await pool.query<Shop>(
    `UPDATE shops SET
       name        = COALESCE($2, name),
       description = CASE WHEN $3::boolean THEN $4 ELSE description END
     WHERE id = $1
     RETURNING ${columns}`,
    [shopId, patch.name ?? null, patch.description !== undefined, patch.description ?? null],
  );
  return rows[0]!;
}
