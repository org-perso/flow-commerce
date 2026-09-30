import { pool, type Db } from '../../db/pool.js';
import { phoneSearchDigits } from '../customer/phone.js';
import type { OrderSource } from './order-source.js';
import { OPEN_STATUSES, type OrderStatus } from './order-status.js';

export type OrderItem = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitSellingPrice: number;
  unitPurchasePrice: number;
  subtotal: number;
};

export type OrderDelivery = {
  /** Area / landmark, e.g. "Analakely". */
  place: string | null;
  address: string | null;
  /** Extra instructions for the delivery. */
  note: string | null;
};

export type Order = {
  id: string;
  /** Per-shop number, shown as #001. */
  number: number;
  status: OrderStatus;
  source: OrderSource | null;
  /** Planned delivery / hand-over day (YYYY-MM-DD, Madagascar). */
  scheduledDate: string;
  /** `phone` is the customer's main number. */
  customer: { id: string; name: string; phone: string | null } | null;
  /** null when the order is not delivered (pickup, hand delivery). */
  delivery: OrderDelivery | null;
  /** Sum of item subtotals (the sale, excluding delivery). */
  itemsAmount: number;
  deliveryFee: number;
  /** What the customer pays: itemsAmount + deliveryFee. */
  totalAmount: number;
  paymentMethod: string | null;
  isPaid: boolean;
  /** When the order was marked as paid; null if not paid. */
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items: OrderItem[];
};

export type OrderFilters = {
  /**
   * today: planned today, plus overdue orders still open (planned before today, not done);
   * upcoming: planned after today.
   */
  when?: 'today' | 'upcoming';
  /** Customer name or phone, order number ("12", "#012") or product name. */
  q?: string;
  status?: OrderStatus;
  customerId?: string;
  from?: string;
  to?: string;
  limit: number;
  offset: number;
};

const TODAY = `(now() AT TIME ZONE 'Indian/Antananarivo')::date`;

const orderColumns = `o.id, o.number, o.status, o.source,
  to_char(o.scheduled_date, 'YYYY-MM-DD') AS "scheduledDate",
  CASE WHEN c.id IS NULL THEN NULL
       ELSE json_build_object('id', c.id, 'name', c.name, 'phone',
         (SELECT cp.phone FROM customer_phones cp WHERE cp.customer_id = c.id
          ORDER BY cp.position, cp.created_at LIMIT 1)) END AS customer,
  CASE WHEN o.is_delivery
       THEN json_build_object('place', o.delivery_place, 'address', o.delivery_address,
                              'note', o.delivery_note)
       ELSE NULL END AS delivery,
  o.total_amount - o.delivery_fee AS "itemsAmount", o.delivery_fee AS "deliveryFee",
  o.total_amount AS "totalAmount", o.payment_method AS "paymentMethod",
  o.paid_at IS NOT NULL AS "isPaid", o.paid_at AS "paidAt",
  o.created_at AS "createdAt", o.updated_at AS "updatedAt"`;

async function attachItems(db: Db, orders: Omit<Order, 'items'>[]): Promise<Order[]> {
  if (orders.length === 0) return [];
  const { rows } = await db.query<OrderItem & { orderId: string }>(
    `SELECT i.id, i.order_id AS "orderId", i.product_id AS "productId", p.name AS "productName",
       i.quantity, i.unit_selling_price AS "unitSellingPrice",
       i.unit_purchase_price AS "unitPurchasePrice", i.subtotal
     FROM order_items i JOIN products p ON p.id = i.product_id
     WHERE i.order_id = ANY($1)
     ORDER BY p.name, i.id`,
    [orders.map((o) => o.id)],
  );
  return orders.map((order) => ({
    ...order,
    items: rows.filter((i) => i.orderId === order.id).map(({ orderId: _, ...item }) => item),
  }));
}

export async function findOrder(
  shopId: string,
  orderId: string,
  db: Db = pool,
): Promise<Order | null> {
  const { rows } = await db.query<Omit<Order, 'items'>>(
    `SELECT ${orderColumns} FROM orders o LEFT JOIN customers c ON c.id = o.customer_id
     WHERE o.id = $1 AND o.shop_id = $2`,
    [orderId, shopId],
  );
  return (await attachItems(db, rows))[0] ?? null;
}

/** WHERE clause shared by the list and the counts; `status` is left to the caller. */
function orderConditions(
  shopId: string,
  filters: Omit<OrderFilters, 'status' | 'limit' | 'offset'>,
) {
  const q = filters.q?.trim() || null;
  const number = q && /^#?\d{1,9}$/.test(q) ? Number(q.replace('#', '')) : null;
  return {
    sql: `o.shop_id = $1
       AND ($2::text IS NULL
            OR ($2 = 'today' AND (o.scheduled_date = ${TODAY}
                                  OR (o.scheduled_date < ${TODAY} AND o.status = ANY($3))))
            OR ($2 = 'upcoming' AND o.scheduled_date > ${TODAY}))
       AND ($4::uuid IS NULL OR o.customer_id = $4)
       AND ($5::date IS NULL OR o.created_at >= $5::date::timestamp AT TIME ZONE 'Indian/Antananarivo')
       AND ($6::date IS NULL OR o.created_at < ($6::date + 1)::timestamp AT TIME ZONE 'Indian/Antananarivo')
       AND ($7::text IS NULL
            OR o.number = $8
            OR c.name ILIKE '%' || $7 || '%'
            OR ($9::text IS NOT NULL AND EXISTS (
              SELECT 1 FROM customer_phones cp
              WHERE cp.customer_id = o.customer_id AND cp.phone LIKE '%' || $9 || '%'))
            OR EXISTS (
              SELECT 1 FROM order_items i JOIN products p ON p.id = i.product_id
              WHERE i.order_id = o.id AND p.name ILIKE '%' || $7 || '%'))`,
    values: [
      shopId,
      filters.when ?? null,
      OPEN_STATUSES,
      filters.customerId ?? null,
      filters.from ?? null,
      filters.to ?? null,
      q,
      number,
      // "#12" is an order number only, never a phone fragment.
      q && !q.startsWith('#') ? phoneSearchDigits(q) : null,
    ],
  };
}

/**
 * `from` / `to` filter on the creation date, `when` on the planned date (business time zone).
 * With `when`, orders come by planned date (overdue first); otherwise newest first.
 */
export async function listOrders(shopId: string, filters: OrderFilters): Promise<Order[]> {
  const where = orderConditions(shopId, filters);
  const { rows } = await pool.query<Omit<Order, 'items'>>(
    `SELECT ${orderColumns} FROM orders o LEFT JOIN customers c ON c.id = o.customer_id
     WHERE ${where.sql} AND ($10::text IS NULL OR o.status = $10)
     ORDER BY
       CASE WHEN $2::text IS NULL THEN NULL ELSE o.scheduled_date END,
       o.created_at DESC, o.id
     LIMIT $11 OFFSET $12`,
    [...where.values, filters.status ?? null, filters.limit, filters.offset],
  );
  return attachItems(pool, rows);
}

/** Number of orders per status with the same filters as the list (for the filter chips). */
export async function countOrdersByStatus(
  shopId: string,
  filters: Omit<OrderFilters, 'status' | 'limit' | 'offset'>,
): Promise<{ total: number; byStatus: Partial<Record<OrderStatus, number>> }> {
  const where = orderConditions(shopId, filters);
  const { rows } = await pool.query<{ status: OrderStatus; count: number }>(
    `SELECT o.status, count(*)::int AS count
     FROM orders o LEFT JOIN customers c ON c.id = o.customer_id
     WHERE ${where.sql} GROUP BY o.status`,
    where.values,
  );
  return {
    total: rows.reduce((sum, r) => sum + r.count, 0),
    byStatus: Object.fromEntries(rows.map((r) => [r.status, r.count])),
  };
}
