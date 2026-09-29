import type pg from 'pg';

import { pool, type Db } from '../../db/pool.js';
import { notFound } from '../../http/params.js';
import { ProblemError } from '../../http/problem.js';

export type StockMovementType = 'AJOUT' | 'RETRAIT' | 'AJUSTEMENT' | 'VENTE' | 'RETOUR';

export type StockMovement = {
  id: string;
  productId: string;
  orderId: string | null;
  type: StockMovementType;
  quantity: number;
  reason: string | null;
  createdAt: Date;
};

const columns = `id, product_id AS "productId", order_id AS "orderId", type, quantity, reason,
  created_at AS "createdAt"`;

type MovementInput = {
  shopId: string;
  productId: string;
  type: StockMovementType;
  /** Signed delta: positive adds stock, negative removes it. */
  quantity: number;
  reason?: string | null;
  orderId?: string | null;
};

/**
 * The only way to change a product's stock. Must run inside a transaction: the
 * guarded UPDATE and the movement row are written together or not at all.
 * Stock never goes below zero (409 Insufficient Stock).
 */
export async function applyStockMovement(
  client: pg.PoolClient,
  input: MovementInput,
): Promise<{ movement: StockMovement; stockQuantity: number }> {
  const updated = await client.query<{ stockQuantity: number }>(
    `UPDATE products SET stock_quantity = stock_quantity + $3
     WHERE id = $1 AND shop_id = $2 AND stock_quantity + $3 >= 0
     RETURNING stock_quantity AS "stockQuantity"`,
    [input.productId, input.shopId, input.quantity],
  );

  if (!updated.rows[0]) {
    const product = await client.query<{ name: string; stockQuantity: number }>(
      `SELECT name, stock_quantity AS "stockQuantity" FROM products WHERE id = $1 AND shop_id = $2`,
      [input.productId, input.shopId],
    );
    if (!product.rows[0]) throw notFound('Product');
    throw new ProblemError(
      409,
      'Insufficient Stock',
      `Not enough stock for "${product.rows[0].name}".`,
      {
        productId: input.productId,
        available: product.rows[0].stockQuantity,
        requested: -input.quantity,
      },
    );
  }

  const movement = await client.query<StockMovement>(
    `INSERT INTO stock_movements (shop_id, product_id, order_id, type, quantity, reason)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${columns}`,
    [
      input.shopId,
      input.productId,
      input.orderId ?? null,
      input.type,
      input.quantity,
      input.reason ?? null,
    ],
  );
  return { movement: movement.rows[0]!, stockQuantity: updated.rows[0].stockQuantity };
}

export async function listStockMovements(
  shopId: string,
  productId: string,
  { limit, offset }: { limit: number; offset: number },
  db: Db = pool,
): Promise<StockMovement[]> {
  const { rows } = await db.query<StockMovement>(
    `SELECT ${columns} FROM stock_movements
     WHERE shop_id = $1 AND product_id = $2
     ORDER BY created_at DESC, id
     LIMIT $3 OFFSET $4`,
    [shopId, productId, limit, offset],
  );
  return rows;
}
