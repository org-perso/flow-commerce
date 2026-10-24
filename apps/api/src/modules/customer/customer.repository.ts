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
  /** Orders not cancelled nor returned. */
  orderCount: number;
  /** Sum of those orders' totals (delivery included), in Ariary. */
  totalSpent: number;
  lastOrderAt: Date | null;
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
  c.social_profile AS "socialProfile",
  COALESCE(st.order_count, 0) AS "orderCount", COALESCE(st.total_spent, 0) AS "totalSpent",
  st.last_order_at AS "lastOrderAt",
  c.created_at AS "createdAt", c.updated_at AS "updatedAt"
  FROM customers c
  LEFT JOIN LATERAL (
    SELECT count(*)::int AS order_count, sum(o.total_amount)::bigint AS total_spent,
           max(o.created_at) AS last_order_at
    FROM orders o
    WHERE o.customer_id = c.id AND o.status NOT IN ('ANNULEE', 'RETOUR')
  ) st ON true`;

/** Live orders (not cancelled nor returned) without a customer file. */
export async function countUnlinkedOrders(shopId: string): Promise<number> {
  const { rows } = await pool.query<{ count: number }>(
    `SELECT count(*)::int AS count FROM orders
     WHERE shop_id = $1 AND customer_id IS NULL AND status NOT IN ('ANNULEE', 'RETOUR')`,
    [shopId],
  );
  return rows[0]!.count;
}

/** Matches the name, the social profile, or any phone ("034 12" finds 0341234567). */
export async function listCustomers(
  shopId: string,
  q?: string,
  page: { limit?: number; offset?: number } = {},
): Promise<Customer[]> {
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
     ORDER BY c.name, c.id
     LIMIT $4::int OFFSET $5::int`,
    [shopId, q ?? null, phoneQuery, page.limit ?? null, page.offset ?? 0],
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
/** A customer keeps at most this many numbers (same limit as the customer form). */
const MAX_CUSTOMER_PHONES = 5;

/**
 * The customer typed in an order form: found by ANY of its numbers (first match wins), or
 * created. A returning customer gets the order's new numbers added to their card, except
 * numbers already used by another customer of the shop (one number = one customer).
 */
export async function findOrCreateCustomer(
  client: pg.PoolClient,
  shopId: string,
  input: { name: string; phones: string[] },
): Promise<Customer> {
  const phones = [
    ...new Set(input.phones.map((p) => normalizePhone(p)).filter((p): p is string => !!p)),
  ];
  // Same lock order for every request: two forms with the same numbers never both create.
  for (const phone of [...phones].sort()) {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`${shopId}:${phone}`]);
  }
  const { rows: owners } = await client.query<{ customerId: string; phone: string }>(
    `SELECT customer_id AS "customerId", phone FROM customer_phones
     WHERE shop_id = $1 AND phone = ANY($2)`,
    [shopId, phones],
  );
  const ownerOf = new Map(owners.map((o) => [o.phone, o.customerId]));
  const existingId = phones.map((p) => ownerOf.get(p)).find(Boolean);

  if (existingId) {
    const free = phones.filter((p) => !ownerOf.has(p));
    if (free.length > 0) {
      await client.query(
        `INSERT INTO customer_phones (shop_id, customer_id, phone, position)
         SELECT $1, $2, p.phone, base.n + p.position
         FROM unnest($3::text[]) WITH ORDINALITY AS p (phone, position),
              (SELECT COALESCE(max(position), 0) AS n, count(*) AS c
               FROM customer_phones WHERE customer_id = $2) base
         WHERE base.c + p.position <= $4
         ON CONFLICT (shop_id, phone) DO NOTHING`,
        [shopId, existingId, free, MAX_CUSTOMER_PHONES],
      );
    }
    return (await findCustomer(shopId, existingId, client))!;
  }
  const id = await insertCustomerRow(client, shopId, {
    name: input.name,
    phones: phones.slice(0, MAX_CUSTOMER_PHONES),
    socialProfile: null,
  });
  return (await findCustomer(shopId, id, client))!;
}
