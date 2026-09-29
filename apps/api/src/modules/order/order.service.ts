import type pg from 'pg';

import { withTransaction } from '../../db/pool.js';
import { notFound } from '../../http/params.js';
import { ProblemError } from '../../http/problem.js';
import {
  findCustomer,
  findOrCreateCustomer,
  type CustomerInput,
} from '../customer/customer.repository.js';
import { applyStockMovement } from '../stock/stock.service.js';
import { holdsStock, TRANSITIONS, type OrderStatus } from './order-status.js';
import { findOrder, type Order } from './order.repository.js';

export type ItemInput = { productId: string; quantity: number };

export type CreateOrderInput = {
  customerId: string | null;
  /** New or returning customer typed in the order form (matched by phone). */
  customer: CustomerInput | null;
  items: ItemInput[];
  deliveryFee: number;
  paymentMethod: string | null;
  address: string | null;
  status: 'EN_ATTENTE' | 'CONFIRMEE';
};

export type UpdateOrderInput = Partial<Omit<CreateOrderInput, 'status' | 'customer'>>;

type LockedOrder = { status: OrderStatus; deliveryFee: number; totalAmount: number };

function unprocessable(detail: string, extra?: Record<string, unknown>) {
  return new ProblemError(422, 'Unprocessable Content', detail, extra);
}

/** Merges duplicate lines and sorts by product id (stable lock order, no deadlocks). */
function normalizeItems(items: ItemInput[]): ItemInput[] {
  const byProduct = new Map<string, number>();
  for (const { productId, quantity } of items) {
    byProduct.set(productId, (byProduct.get(productId) ?? 0) + quantity);
  }
  return [...byProduct]
    .map(([productId, quantity]) => ({ productId, quantity }))
    .sort((a, b) => a.productId.localeCompare(b.productId));
}

async function assertCustomer(client: pg.PoolClient, shopId: string, customerId: string) {
  const customer = await findCustomer(shopId, customerId, client);
  if (!customer) throw unprocessable('Customer not found.', { customerId });
  return customer;
}

/**
 * Writes the order lines with prices frozen from the current products.
 * Returns the items amount (sum of subtotals).
 */
async function insertItems(
  client: pg.PoolClient,
  shopId: string,
  orderId: string,
  items: ItemInput[],
): Promise<number> {
  const ids = items.map((i) => i.productId);
  const { rows: products } = await client.query<{
    id: string;
    sellingPrice: number;
    purchasePrice: number;
  }>(
    `SELECT id, selling_price AS "sellingPrice", purchase_price AS "purchasePrice"
     FROM products WHERE shop_id = $1 AND id = ANY($2) AND archived_at IS NULL`,
    [shopId, ids],
  );
  const missing = ids.filter((id) => !products.some((p) => p.id === id));
  if (missing.length > 0) {
    throw unprocessable('Unknown or archived product.', { productIds: missing });
  }

  const lines = items.map(({ productId, quantity }) => {
    const product = products.find((p) => p.id === productId)!;
    return {
      productId,
      quantity,
      unitSellingPrice: product.sellingPrice,
      unitPurchasePrice: product.purchasePrice,
      subtotal: quantity * product.sellingPrice,
    };
  });

  await client.query(
    `INSERT INTO order_items (shop_id, order_id, product_id, quantity,
       unit_selling_price, unit_purchase_price, subtotal)
     SELECT $1, $2, * FROM unnest($3::uuid[], $4::int[], $5::bigint[], $6::bigint[], $7::bigint[])`,
    [
      shopId,
      orderId,
      lines.map((l) => l.productId),
      lines.map((l) => l.quantity),
      lines.map((l) => l.unitSellingPrice),
      lines.map((l) => l.unitPurchasePrice),
      lines.map((l) => l.subtotal),
    ],
  );
  return lines.reduce((sum, l) => sum + l.subtotal, 0);
}

/** VENTE movements for every line (stock taken), or RETOUR movements (stock given back). */
async function moveOrderStock(
  client: pg.PoolClient,
  shopId: string,
  orderId: string,
  direction: 'take' | 'release',
  reason: string,
) {
  const { rows: items } = await client.query<{ productId: string; quantity: number }>(
    `SELECT product_id AS "productId", quantity FROM order_items
     WHERE order_id = $1 ORDER BY product_id`,
    [orderId],
  );
  for (const item of items) {
    await applyStockMovement(client, {
      shopId,
      productId: item.productId,
      orderId,
      type: direction === 'take' ? 'VENTE' : 'RETOUR',
      quantity: direction === 'take' ? -item.quantity : item.quantity,
      reason,
    });
  }
}

async function lockOrder(client: pg.PoolClient, shopId: string, orderId: string) {
  const { rows } = await client.query<LockedOrder>(
    `SELECT status, delivery_fee AS "deliveryFee", total_amount AS "totalAmount"
     FROM orders WHERE id = $1 AND shop_id = $2 FOR UPDATE`,
    [orderId, shopId],
  );
  if (!rows[0]) throw notFound('Order');
  return rows[0];
}

export function createOrder(shopId: string, input: CreateOrderInput): Promise<Order> {
  return withTransaction(async (client) => {
    let customerId = input.customerId;
    let address = input.address;
    if (input.customerId) {
      const customer = await assertCustomer(client, shopId, input.customerId);
      address ??= customer.address;
    } else if (input.customer) {
      const customer = await findOrCreateCustomer(client, shopId, input.customer);
      customerId = customer.id;
      address ??= customer.address;
    }

    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO orders (shop_id, customer_id, status, delivery_fee, payment_method, address)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [shopId, customerId, input.status, input.deliveryFee, input.paymentMethod, address],
    );
    const orderId = rows[0]!.id;

    const itemsAmount = await insertItems(client, shopId, orderId, normalizeItems(input.items));
    await client.query('UPDATE orders SET total_amount = $2 WHERE id = $1', [
      orderId,
      itemsAmount + input.deliveryFee,
    ]);

    if (holdsStock(input.status)) {
      await moveOrderStock(client, shopId, orderId, 'take', 'Commande confirmée');
    }
    return (await findOrder(shopId, orderId, client))!;
  });
}

/**
 * Edits an order. Lines can only change while the order is pending (no stock taken yet);
 * they are re-priced from the current products. Final orders cannot be edited.
 */
export function updateOrder(
  shopId: string,
  orderId: string,
  patch: UpdateOrderInput,
): Promise<Order> {
  return withTransaction(async (client) => {
    const order = await lockOrder(client, shopId, orderId);
    if (TRANSITIONS[order.status].length === 0) {
      throw new ProblemError(409, 'Conflict', 'A cancelled or returned order cannot be edited.');
    }
    if (patch.items && order.status !== 'EN_ATTENTE') {
      throw new ProblemError(
        409,
        'Conflict',
        'Items can only be changed while the order is pending.',
      );
    }
    if (patch.customerId) await assertCustomer(client, shopId, patch.customerId);

    let itemsAmount = order.totalAmount - order.deliveryFee;
    if (patch.items) {
      await client.query('DELETE FROM order_items WHERE order_id = $1', [orderId]);
      itemsAmount = await insertItems(client, shopId, orderId, normalizeItems(patch.items));
    }
    const deliveryFee = patch.deliveryFee ?? order.deliveryFee;

    await client.query(
      `UPDATE orders SET
         customer_id    = CASE WHEN $3::boolean THEN $4::uuid ELSE customer_id END,
         payment_method = CASE WHEN $5::boolean THEN $6 ELSE payment_method END,
         address        = CASE WHEN $7::boolean THEN $8 ELSE address END,
         delivery_fee   = $9,
         total_amount   = $10
       WHERE id = $1 AND shop_id = $2`,
      [
        orderId,
        shopId,
        patch.customerId !== undefined,
        patch.customerId ?? null,
        patch.paymentMethod !== undefined,
        patch.paymentMethod ?? null,
        patch.address !== undefined,
        patch.address ?? null,
        deliveryFee,
        itemsAmount + deliveryFee,
      ],
    );
    return (await findOrder(shopId, orderId, client))!;
  });
}

/**
 * Moves the order to `next`, keeping stock consistent:
 * entering a confirmed status takes stock (VENTE), cancelling or returning
 * an order that held stock gives it back (RETOUR). All in one transaction.
 */
export function changeOrderStatus(
  shopId: string,
  orderId: string,
  next: OrderStatus,
): Promise<Order> {
  return withTransaction(async (client) => {
    const { status } = await lockOrder(client, shopId, orderId);
    if (!TRANSITIONS[status].includes(next)) {
      throw new ProblemError(
        409,
        'Invalid Status Transition',
        `Cannot go from ${status} to ${next}.`,
        {
          from: status,
          to: next,
          allowed: TRANSITIONS[status],
        },
      );
    }

    if (!holdsStock(status) && holdsStock(next)) {
      await moveOrderStock(client, shopId, orderId, 'take', 'Commande confirmée');
    } else if (holdsStock(status) && !holdsStock(next)) {
      const reason = next === 'RETOUR' ? 'Retour client' : 'Commande annulée';
      await moveOrderStock(client, shopId, orderId, 'release', reason);
    }

    await client.query('UPDATE orders SET status = $3 WHERE id = $1 AND shop_id = $2', [
      orderId,
      shopId,
      next,
    ]);
    return (await findOrder(shopId, orderId, client))!;
  });
}
