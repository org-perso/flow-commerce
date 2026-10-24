import type pg from 'pg';

import { withTransaction } from '../../db/pool.js';
import { notFound } from '../../http/params.js';
import { ProblemError } from '../../http/problem.js';
import { findCustomer, findOrCreateCustomer } from '../customer/customer.repository.js';
import { assertWithinLimit } from '../subscription/plans.js';
import { applyStockMovement } from '../stock/stock.service.js';
import { holdsStock, TRANSITIONS, type OrderStatus } from './order-status.js';
import type { OrderSource } from './order-source.js';
import { findOrder, type Order } from './order.repository.js';

export type ItemInput = { productId: string; quantity: number };

export type DeliveryInput = {
  place: string | null;
  address: string | null;
  note: string | null;
  fee: number;
  /** Number to call for a walk-in customer (no customer card). */
  phone?: string | null;
};

export type CreateOrderInput = {
  customerId: string | null;
  /** New or returning customer typed in the order form (matched by phone). */
  customer: { name: string; phones: string[] } | null;
  /** Numbers for this order (first = main); absent from older apps (delivery.phone only). */
  phones?: string[];
  items: ItemInput[];
  source: OrderSource | null;
  /** Planned day (YYYY-MM-DD); null means today. */
  scheduledDate: string | null;
  /** Hours of the planned day; null: any time. */
  timeSlot: { from: string | null; to: string | null } | null;
  /** null: not delivered (pickup, hand delivery), so no delivery fee. */
  delivery: DeliveryInput | null;
  paymentMethod: string | null;
  /** Already paid by the customer. */
  isPaid: boolean;
  status: 'EN_ATTENTE' | 'CONFIRMEE';
};

export type UpdateOrderInput = Partial<Omit<CreateOrderInput, 'status'>>;

/**
 * The order's numbers: the list sent by the app, or, from an older app, its delivery number
 * (or the customer's). The first one is the delivery number (delivery_phone).
 */
function orderPhones(
  phones: string[] | undefined,
  delivery: DeliveryInput | null | undefined,
  customer?: { phones: string[] } | null,
): string[] | undefined {
  if (phones) return phones;
  if (delivery?.phone) return [delivery.phone];
  if (customer?.phones.length) return customer.phones.slice(0, 3);
  return undefined;
}

type LockedOrder = { status: OrderStatus; deliveryFee: number; totalAmount: number };

/** Column values for a delivery (or its absence); its number is the order's main one. */
function deliveryColumns(delivery: DeliveryInput | null, phones?: string[]) {
  return [
    delivery !== null,
    delivery?.place ?? null,
    delivery?.address ?? null,
    delivery?.note ?? null,
    delivery?.fee ?? 0,
    delivery ? (phones?.[0] ?? delivery.phone ?? null) : null,
  ] as const;
}

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
    // Free plan: orders per month (docs/subscription.md), when the limits are on.
    await assertWithinLimit(shopId, 'orders', client);
    let customerId = input.customerId;
    if (input.customerId) {
      await assertCustomer(client, shopId, input.customerId);
    } else if (input.customer) {
      customerId = (await findOrCreateCustomer(client, shopId, input.customer)).id;
    }

    const phones = orderPhones(input.phones, input.delivery, input.customer) ?? [];

    // Next number of the shop; the row lock serializes concurrent orders.
    const { rows: counter } = await client.query<{ number: number }>(
      `UPDATE shops SET last_order_number = last_order_number + 1
       WHERE id = $1 RETURNING last_order_number AS number`,
      [shopId],
    );
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO orders (shop_id, customer_id, status, source, payment_method,
         is_delivery, delivery_place, delivery_address, delivery_note, delivery_fee,
         delivery_phone, scheduled_date, paid_at, number, slot_from, slot_to, phones)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
         COALESCE($12::date, (now() AT TIME ZONE 'Indian/Antananarivo')::date),
         CASE WHEN $13::boolean THEN now() END, $14, $15::time, $16::time, $17)
       RETURNING id`,
      [
        shopId,
        customerId,
        input.status,
        input.source,
        input.paymentMethod,
        ...deliveryColumns(input.delivery, phones),
        input.scheduledDate,
        input.isPaid,
        counter[0]!.number,
        input.timeSlot?.from ?? null,
        input.timeSlot?.to ?? null,
        phones,
      ],
    );
    const orderId = rows[0]!.id;

    const itemsAmount = await insertItems(client, shopId, orderId, normalizeItems(input.items));
    await client.query('UPDATE orders SET total_amount = $2 WHERE id = $1', [
      orderId,
      itemsAmount + (input.delivery?.fee ?? 0),
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
    if (patch.customer) {
      patch = {
        ...patch,
        customerId: (await findOrCreateCustomer(client, shopId, patch.customer)).id,
      };
    }
    // Older apps only send delivery.phone: it becomes the main number, the others stay.
    const legacyPhone = patch.phones === undefined ? (patch.delivery?.phone ?? null) : null;
    const phones = patch.phones;

    let itemsAmount = order.totalAmount - order.deliveryFee;
    if (patch.items) {
      await client.query('DELETE FROM order_items WHERE order_id = $1', [orderId]);
      itemsAmount = await insertItems(client, shopId, orderId, normalizeItems(patch.items));
    }
    if (patch.delivery !== undefined) {
      await client.query(
        `UPDATE orders SET is_delivery = $2, delivery_place = $3, delivery_address = $4,
           delivery_note = $5, delivery_fee = $6, delivery_phone = $7 WHERE id = $1`,
        [orderId, ...deliveryColumns(patch.delivery, phones)],
      );
    }
    if (phones !== undefined) {
      // New numbers: the order's list, and the first one as the delivery number.
      await client.query(
        `UPDATE orders SET phones = $2,
           delivery_phone = CASE WHEN is_delivery THEN $3 ELSE NULL END
         WHERE id = $1`,
        [orderId, phones, phones[0] ?? null],
      );
    } else if (legacyPhone) {
      await client.query(
        `UPDATE orders SET phones = (ARRAY[$2]::varchar[] || array_remove(phones, $2))[1:3]
         WHERE id = $1`,
        [orderId, legacyPhone],
      );
    }
    const deliveryFee =
      patch.delivery !== undefined ? (patch.delivery?.fee ?? 0) : order.deliveryFee;

    await client.query(
      `UPDATE orders SET
         customer_id    = CASE WHEN $3::boolean THEN $4::uuid ELSE customer_id END,
         payment_method = CASE WHEN $5::boolean THEN $6 ELSE payment_method END,
         source         = CASE WHEN $7::boolean THEN $8 ELSE source END,
         scheduled_date = COALESCE($10::date, scheduled_date),
         slot_from      = CASE WHEN $12::boolean THEN $13::time ELSE slot_from END,
         slot_to        = CASE WHEN $12::boolean THEN $14::time ELSE slot_to END,
         paid_at        = CASE WHEN $11::boolean IS NULL THEN paid_at
                               WHEN $11 THEN COALESCE(paid_at, now()) END,
         total_amount   = $9
       WHERE id = $1 AND shop_id = $2`,
      [
        orderId,
        shopId,
        patch.customerId !== undefined,
        patch.customerId ?? null,
        patch.paymentMethod !== undefined,
        patch.paymentMethod ?? null,
        patch.source !== undefined,
        patch.source ?? null,
        itemsAmount + deliveryFee,
        patch.scheduledDate ?? null,
        patch.isPaid ?? null,
        patch.timeSlot !== undefined,
        patch.timeSlot?.from ?? null,
        patch.timeSlot?.to ?? null,
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
