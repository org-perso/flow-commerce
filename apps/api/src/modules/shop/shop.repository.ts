import { pool } from '../../db/pool.js';

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

export async function createShop(ownerId: string, input: ShopInput): Promise<Shop> {
  const { rows } = await pool.query<Shop>(
    `INSERT INTO shops (owner_id, name, description) VALUES ($1, $2, $3) RETURNING ${columns}`,
    [ownerId, input.name, input.description],
  );
  return rows[0]!;
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
