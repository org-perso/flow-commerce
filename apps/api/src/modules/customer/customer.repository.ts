import { pool, type Db } from '../../db/pool.js';
import { buildSet } from '../../db/sql.js';

export type Customer = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CustomerInput = {
  name: string;
  phone: string | null;
  address: string | null;
};

const columns = `id, name, phone, address, created_at AS "createdAt", updated_at AS "updatedAt"`;

export async function listCustomers(shopId: string, q?: string): Promise<Customer[]> {
  const { rows } = await pool.query<Customer>(
    `SELECT ${columns} FROM customers
     WHERE shop_id = $1 AND ($2::text IS NULL OR name ILIKE '%' || $2 || '%' OR phone ILIKE '%' || $2 || '%')
     ORDER BY name, id`,
    [shopId, q ?? null],
  );
  return rows;
}

export async function findCustomer(
  shopId: string,
  customerId: string,
  db: Db = pool,
): Promise<Customer | null> {
  const { rows } = await db.query<Customer>(
    `SELECT ${columns} FROM customers WHERE id = $1 AND shop_id = $2`,
    [customerId, shopId],
  );
  return rows[0] ?? null;
}

export async function insertCustomer(shopId: string, input: CustomerInput): Promise<Customer> {
  const { rows } = await pool.query<Customer>(
    `INSERT INTO customers (shop_id, name, phone, address) VALUES ($1, $2, $3, $4)
     RETURNING ${columns}`,
    [shopId, input.name, input.phone, input.address],
  );
  return rows[0]!;
}

export async function updateCustomer(
  shopId: string,
  customerId: string,
  patch: Partial<CustomerInput>,
): Promise<Customer | null> {
  const set = buildSet(patch, { name: 'name', phone: 'phone', address: 'address' }, 3);
  if (!set.sql) return findCustomer(shopId, customerId);
  const { rows } = await pool.query<Customer>(
    `UPDATE customers SET ${set.sql} WHERE id = $1 AND shop_id = $2 RETURNING ${columns}`,
    [customerId, shopId, ...set.values],
  );
  return rows[0] ?? null;
}

/** Returns 'deleted', 'not_found', or 'has_orders' (customers with orders are kept for history). */
export async function deleteCustomer(
  shopId: string,
  customerId: string,
): Promise<'deleted' | 'not_found' | 'has_orders'> {
  const { rowCount } = await pool.query(
    `DELETE FROM customers c WHERE c.id = $1 AND c.shop_id = $2
       AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id)`,
    [customerId, shopId],
  );
  if (rowCount) return 'deleted';
  return (await findCustomer(shopId, customerId)) ? 'has_orders' : 'not_found';
}
