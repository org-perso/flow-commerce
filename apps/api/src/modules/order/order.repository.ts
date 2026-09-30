import { pool, type Db } from '../../db/pool.js';
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
  status?: OrderStatus;
  customerId?: string;
  from?: string;
  to?: string;
  limit: number;
  offset: number;
};

const TODAY = `(now() AT TIME ZONE 'Indian/Antananarivo')::date`;

const orderColumns = `o.id, o.status, o.source,
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

/**
 * `from` / `to` filter on the creation date, `when` on the planned date (business time zone).
 * With `when`, orders come by planned date (overdue first); otherwise newest first.
 */
export async function listOrders(shopId: string, filters: OrderFilters): Promise<Order[]> {
  const { rows } = await pool.query<Omit<Order, 'items'>>(
    `SELECT ${orderColumns} FROM orders o LEFT JOIN customers c ON c.id = o.customer_id
     WHERE o.shop_id = $1
       AND ($8::text IS NULL
            OR ($8 = 'today' AND (o.scheduled_date = ${TODAY}
                                  OR (o.scheduled_date < ${TODAY} AND o.status = ANY($9))))
            OR ($8 = 'upcoming' AND o.scheduled_date > ${TODAY}))
       AND ($2::text IS NULL OR o.status = $2)
       AND ($3::uuid IS NULL OR o.customer_id = $3)
       AND ($4::date IS NULL OR o.created_at >= $4::date::timestamp AT TIME ZONE 'Indian/Antananarivo')
       AND ($5::date IS NULL OR o.created_at < ($5::date + 1)::timestamp AT TIME ZONE 'Indian/Antananarivo')
     ORDER BY
       CASE WHEN $8::text IS NULL THEN NULL ELSE o.scheduled_date END,
       o.created_at DESC, o.id
     LIMIT $6 OFFSET $7`,
    [
      shopId,
      filters.status ?? null,
      filters.customerId ?? null,
      filters.from ?? null,
      filters.to ?? null,
      filters.limit,
      filters.offset,
      filters.when ?? null,
      OPEN_STATUSES,
    ],
  );
  return attachItems(pool, rows);
}
