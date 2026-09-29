import { pool, type Db } from '../../db/pool.js';
import type { OrderStatus } from './order-status.js';

export type OrderItem = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitSellingPrice: number;
  unitPurchasePrice: number;
  subtotal: number;
};

export type Order = {
  id: string;
  status: OrderStatus;
  customer: { id: string; name: string; phone: string | null } | null;
  /** Sum of item subtotals (the sale, excluding delivery). */
  itemsAmount: number;
  deliveryFee: number;
  /** What the customer pays: itemsAmount + deliveryFee. */
  totalAmount: number;
  paymentMethod: string | null;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: OrderItem[];
};

export type OrderFilters = {
  status?: OrderStatus;
  customerId?: string;
  from?: string;
  to?: string;
  limit: number;
  offset: number;
};

const orderColumns = `o.id, o.status,
  CASE WHEN c.id IS NULL THEN NULL
       ELSE json_build_object('id', c.id, 'name', c.name, 'phone', c.phone) END AS customer,
  o.total_amount - o.delivery_fee AS "itemsAmount", o.delivery_fee AS "deliveryFee",
  o.total_amount AS "totalAmount", o.payment_method AS "paymentMethod", o.address,
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
 * `from` / `to` are calendar dates in the business time zone (order creation date).
 */
export async function listOrders(shopId: string, filters: OrderFilters): Promise<Order[]> {
  const { rows } = await pool.query<Omit<Order, 'items'>>(
    `SELECT ${orderColumns} FROM orders o LEFT JOIN customers c ON c.id = o.customer_id
     WHERE o.shop_id = $1
       AND ($2::text IS NULL OR o.status = $2)
       AND ($3::uuid IS NULL OR o.customer_id = $3)
       AND ($4::date IS NULL OR o.created_at >= $4::date::timestamp AT TIME ZONE 'Indian/Antananarivo')
       AND ($5::date IS NULL OR o.created_at < ($5::date + 1)::timestamp AT TIME ZONE 'Indian/Antananarivo')
     ORDER BY o.created_at DESC, o.id
     LIMIT $6 OFFSET $7`,
    [
      shopId,
      filters.status ?? null,
      filters.customerId ?? null,
      filters.from ?? null,
      filters.to ?? null,
      filters.limit,
      filters.offset,
    ],
  );
  return attachItems(pool, rows);
}
