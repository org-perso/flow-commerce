import { pool, withTransaction } from '../../db/pool.js';
import { seedDefaultCategories } from '../category/category.repository.js';

export type Shop = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ShopInput = {
  name: string;
  description: string | null;
};

const columns = `id, name, description, created_at AS "createdAt", updated_at AS "updatedAt"`;

export async function listShopsByOwner(ownerId: string): Promise<Shop[]> {
  const { rows } = await pool.query<Shop>(
    `SELECT ${columns} FROM shops WHERE owner_id = $1 ORDER BY created_at`,
    [ownerId],
  );
  return rows;
}

/** Ownership is part of the lookup: another user's shop is simply not found. */
export async function findShopForOwner(shopId: string, ownerId: string): Promise<Shop | null> {
  const { rows } = await pool.query<Shop>(
    `SELECT ${columns} FROM shops WHERE id = $1 AND owner_id = $2`,
    [shopId, ownerId],
  );
  return rows[0] ?? null;
}

/** Creates the shop with its standard product categories. */
export function createShop(ownerId: string, input: ShopInput): Promise<Shop> {
  return withTransaction(async (client) => {
    const { rows } = await client.query<Shop>(
      `INSERT INTO shops (owner_id, name, description) VALUES ($1, $2, $3) RETURNING ${columns}`,
      [ownerId, input.name, input.description],
    );
    const shop = rows[0]!;
    await seedDefaultCategories(client, shop.id);
    return shop;
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
