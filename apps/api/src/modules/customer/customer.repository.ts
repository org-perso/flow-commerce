import type pg from 'pg';

import { pool, withTransaction, type Db } from '../../db/pool.js';
import { ProblemError } from '../../http/problem.js';
import { normalizePhone, phoneSearchDigits } from './phone.js';

export type Customer = {
  id: string;
  name: string;
  /** Normalized numbers ("0341234567") in display order: the first one is the main number. */
  phones: string[];
  /** Facebook name, profile link, @handle… */
  socialProfile: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CustomerInput = {
  name: string;
  phones: string[];
  socialProfile: string | null;
};

const select = `SELECT c.id, c.name,
  COALESCE((SELECT json_agg(cp.phone ORDER BY cp.position, cp.created_at)
            FROM customer_phones cp WHERE cp.customer_id = c.id), '[]') AS phones,
  c.social_profile AS "socialProfile", c.created_at AS "createdAt", c.updated_at AS "updatedAt"
  FROM customers c`;

/** Matches the name, the social profile, or any phone ("034 12" finds 0341234567). */
export async function listCustomers(shopId: string, q?: string): Promise<Customer[]> {
  const phoneQuery = q ? phoneSearchDigits(q) : null;
  const { rows } = await pool.query<Customer>(
    `${select}
     WHERE c.shop_id = $1
       AND ($2::text IS NULL
            OR c.name ILIKE '%' || $2 || '%'
            OR c.social_profile ILIKE '%' || $2 || '%'
            OR ($3::text IS NOT NULL AND EXISTS (
              SELECT 1 FROM customer_phones cp
              WHERE cp.customer_id = c.id AND cp.phone LIKE '%' || $3 || '%')))
     ORDER BY c.name, c.id`,
    [shopId, q ?? null, phoneQuery],
  );
  return rows;
}

export async function findCustomer(
  shopId: string,
  customerId: string,
  db: Db = pool,
): Promise<Customer | null> {
  const { rows } = await db.query<Customer>(`${select} WHERE c.id = $1 AND c.shop_id = $2`, [
    customerId,
    shopId,
  ]);
  return rows[0] ?? null;
}

export async function findCustomerByPhone(
  shopId: string,
  phone: string,
  db: Db = pool,
): Promise<Customer | null> {
  const { rows } = await db.query<Customer>(
    `${select} JOIN customer_phones p ON p.customer_id = c.id
     WHERE c.shop_id = $1 AND p.phone = $2`,
    [shopId, normalizePhone(phone)],
  );
  return rows[0] ?? null;
}

/** 409 if one of `phones` already belongs to another customer of the shop. */
async function assertPhonesFree(
  db: Db,
  shopId: string,
  phones: string[],
  customerId: string | null,
) {
  if (phones.length === 0) return;
  const { rows } = await db.query<{ customerId: string; phone: string }>(
    `SELECT customer_id AS "customerId", phone FROM customer_phones
     WHERE shop_id = $1 AND phone = ANY($2) AND ($3::uuid IS NULL OR customer_id <> $3)
     LIMIT 1`,
    [shopId, phones, customerId],
  );
  if (rows[0]) {
    throw new ProblemError(409, 'Duplicate Phone', 'A customer already has this phone number.', {
      customerId: rows[0].customerId,
      phone: rows[0].phone,
    });
  }
}

/**
 * Adds the numbers in this order (first = main), or re-positions the ones the customer
 * already has. A number owned by another customer is left untouched (checked beforehand).
 */
async function setPhones(db: Db, shopId: string, customerId: string, phones: string[]) {
  await db.query(
    `INSERT INTO customer_phones (shop_id, customer_id, phone, position)
     SELECT $1, $2, p.phone, p.position
     FROM unnest($3::text[]) WITH ORDINALITY AS p (phone, position)
     ON CONFLICT (shop_id, phone) DO UPDATE SET position = EXCLUDED.position
       WHERE customer_phones.customer_id = EXCLUDED.customer_id`,
    [shopId, customerId, phones],
  );
}

async function insertCustomerRow(db: pg.PoolClient, shopId: string, input: CustomerInput) {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO customers (shop_id, name, social_profile) VALUES ($1, $2, $3) RETURNING id`,
    [shopId, input.name, input.socialProfile],
  );
  const id = rows[0]!.id;
  await setPhones(db, shopId, id, input.phones);
  return id;
}

export function insertCustomer(shopId: string, input: CustomerInput): Promise<Customer> {
  return withTransaction(async (client) => {
    await assertPhonesFree(client, shopId, input.phones, null);
    const id = await insertCustomerRow(client, shopId, input);
    return (await findCustomer(shopId, id, client))!;
  });
}

/** `phones`, when given, replaces the customer's numbers. */
export function updateCustomer(
  shopId: string,
  customerId: string,
  patch: Partial<CustomerInput>,
): Promise<Customer | null> {
  return withTransaction(async (client) => {
    const { rowCount } = await client.query(
      `UPDATE customers SET
         name           = COALESCE($3, name),
         social_profile = CASE WHEN $4::boolean THEN $5 ELSE social_profile END
       WHERE id = $1 AND shop_id = $2`,
      [
        customerId,
        shopId,
        patch.name ?? null,
        patch.socialProfile !== undefined,
        patch.socialProfile ?? null,
      ],
    );
    if (!rowCount) return null;

    if (patch.phones) {
      await assertPhonesFree(client, shopId, patch.phones, customerId);
      await client.query(
        `DELETE FROM customer_phones WHERE customer_id = $1 AND phone <> ALL($2::text[])`,
        [customerId, patch.phones],
      );
      await setPhones(client, shopId, customerId, patch.phones);
    }
    return findCustomer(shopId, customerId, client);
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
 * or creates it. An existing customer is not modified by the typed name.
 * Serialized per (shop, phone) so two concurrent orders cannot create it twice.
 */
export async function findOrCreateCustomer(
  client: pg.PoolClient,
  shopId: string,
  input: { name: string; phone: string | null },
): Promise<Customer> {
  const phone = normalizePhone(input.phone);
  if (phone) {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`${shopId}:${phone}`]);
    const existing = await findCustomerByPhone(shopId, phone, client);
    if (existing) return existing;
  }
  const id = await insertCustomerRow(client, shopId, {
    name: input.name,
    phones: phone ? [phone] : [],
    socialProfile: null,
  });
  return (await findCustomer(shopId, id, client))!;
}
