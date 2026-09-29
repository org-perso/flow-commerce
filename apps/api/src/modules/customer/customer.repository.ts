import { pool, type Db } from '../../db/pool.js';
import { buildSet } from '../../db/sql.js';
import { ProblemError } from '../../http/problem.js';
import { normalizePhone, phoneSearchDigits } from './phone.js';

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

/** Matches the name, or the phone when the search contains digits ("034 12" finds 0341234567). */
export async function listCustomers(shopId: string, q?: string): Promise<Customer[]> {
  const phoneQuery = q ? phoneSearchDigits(q) : null;
  const { rows } = await pool.query<Customer>(
    `SELECT ${columns} FROM customers
     WHERE shop_id = $1
       AND ($2::text IS NULL OR name ILIKE '%' || $2 || '%'
            OR ($3::text IS NOT NULL AND phone LIKE '%' || $3 || '%'))
     ORDER BY name, id`,
    [shopId, q ?? null, phoneQuery],
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

export async function findCustomerByPhone(
  shopId: string,
  phone: string,
  db: Db = pool,
): Promise<Customer | null> {
  const { rows } = await db.query<Customer>(
    `SELECT ${columns} FROM customers WHERE shop_id = $1 AND phone = $2`,
    [shopId, normalizePhone(phone)],
  );
  return rows[0] ?? null;
}

/** Turns the unique-phone violation into a 409 pointing at the existing customer. */
async function withDuplicatePhoneCheck<T>(
  shopId: string,
  phone: string | null | undefined,
  write: () => Promise<T>,
): Promise<T> {
  try {
    return await write();
  } catch (error) {
    if ((error as { code?: string }).code === '23505' && phone) {
      const existing = await findCustomerByPhone(shopId, phone);
      throw new ProblemError(409, 'Duplicate Phone', 'A customer already has this phone number.', {
        customerId: existing?.id,
      });
    }
    throw error;
  }
}

export async function insertCustomer(
  shopId: string,
  input: CustomerInput,
  db: Db = pool,
): Promise<Customer> {
  const phone = normalizePhone(input.phone);
  return withDuplicatePhoneCheck(shopId, phone, async () => {
    const { rows } = await db.query<Customer>(
      `INSERT INTO customers (shop_id, name, phone, address) VALUES ($1, $2, $3, $4)
       RETURNING ${columns}`,
      [shopId, input.name, phone, input.address],
    );
    return rows[0]!;
  });
}

export async function updateCustomer(
  shopId: string,
  customerId: string,
  patch: Partial<CustomerInput>,
): Promise<Customer | null> {
  const normalized = {
    ...patch,
    ...(patch.phone !== undefined && { phone: normalizePhone(patch.phone) }),
  };
  const set = buildSet(normalized, { name: 'name', phone: 'phone', address: 'address' }, 3);
  if (!set.sql) return findCustomer(shopId, customerId);
  return withDuplicatePhoneCheck(shopId, normalized.phone, async () => {
    const { rows } = await pool.query<Customer>(
      `UPDATE customers SET ${set.sql} WHERE id = $1 AND shop_id = $2 RETURNING ${columns}`,
      [customerId, shopId, ...set.values],
    );
    return rows[0] ?? null;
  });
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

/**
 * Customer typed while creating an order: reuses the shop's customer with this phone,
 * or creates it. Safe under concurrency (ON CONFLICT on the unique phone).
 * An existing customer is not modified by the typed name / address.
 */
export async function findOrCreateCustomer(
  db: Db,
  shopId: string,
  input: CustomerInput,
): Promise<Customer> {
  const phone = normalizePhone(input.phone);
  const inserted = await db.query<Customer>(
    `INSERT INTO customers (shop_id, name, phone, address) VALUES ($1, $2, $3, $4)
     ON CONFLICT (shop_id, phone) WHERE phone IS NOT NULL DO NOTHING
     RETURNING ${columns}`,
    [shopId, input.name, phone, input.address],
  );
  if (inserted.rows[0]) return inserted.rows[0];
  return (await findCustomerByPhone(shopId, phone!, db))!;
}
