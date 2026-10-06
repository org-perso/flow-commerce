import { beforeEach, describe, expect, it } from 'vitest';

import { pool } from '../src/db/pool.js';
import type { Role } from '../src/modules/shop/permissions.js';
import { auth, createProduct, createShop, request, resetDatabase } from './helpers.js';

const owner = auth('owner');
const cm = auth('cm');

let shopId: string;
let soap: string;
let dress: string;
const api = (path = '') => `/api/v1/shops/${shopId}${path}`;

async function addMember(uid: string, role: Role) {
  await request.get('/api/v1/me').set(auth(uid));
  await pool.query(
    `INSERT INTO shop_members (shop_id, user_id, role)
     SELECT $1, id, $3 FROM users WHERE firebase_uid = $2`,
    [shopId, uid, role],
  );
}

async function order(items: [string, number][], status = 'CONFIRMEE'): Promise<string> {
  const res = await request
    .post(api('/orders'))
    .set(owner)
    .send({ items: items.map(([productId, quantity]) => ({ productId, quantity })), status });
  expect(res.status).toBe(201);
  return res.body.id;
}

beforeEach(async () => {
  await resetDatabase();
  shopId = await createShop(owner);
  soap = (
    await createProduct(owner, shopId, {
      name: 'Savon',
      purchasePrice: 1000,
      sellingPrice: 3000,
      initialStock: 50,
    })
  ).id;
  dress = (
    await createProduct(owner, shopId, {
      name: 'Robe',
      purchasePrice: 20000,
      sellingPrice: 45000,
      initialStock: 10,
    })
  ).id;
  await addMember('cm', 'CM');
});

describe('GET /reports/products', () => {
  it('sums quantities, revenue and margin per product, most sold first', async () => {
    await order([
      [soap, 2],
      [dress, 1],
    ]);
    await order([[soap, 3]]);
    // Not counted: still pending, and cancelled.
    await order([[soap, 10]], 'EN_ATTENTE');
    const cancelled = await order([[dress, 2]]);
    await request
      .post(api(`/orders/${cancelled}/status`))
      .set(owner)
      .send({ status: 'ANNULEE' });

    const res = await request.get(api('/reports/products')).set(owner);
    expect(res.status).toBe(200);
    expect(res.body.products).toEqual([
      {
        productId: soap,
        productName: 'Savon',
        quantity: 5,
        revenue: 15000,
        cost: 5000,
        margin: 10000,
      },
      {
        productId: dress,
        productName: 'Robe',
        quantity: 1,
        revenue: 45000,
        cost: 20000,
        margin: 25000,
      },
    ]);
    expect(res.body.totals).toEqual({ quantity: 6, revenue: 60000, cost: 25000, margin: 35000 });
  });

  it('gives the CM quantities only: no revenue, no costs', async () => {
    await order([[soap, 2]]);
    const res = await request.get(api('/reports/products')).set(cm);
    expect(res.status).toBe(200);
    expect(res.body.products[0]).toEqual({ productId: soap, productName: 'Savon', quantity: 2 });
    expect(res.body.totals).toEqual({ quantity: 2 });
  });

  it('only counts the orders created between the two days', async () => {
    const old = await order([[soap, 4]]);
    await pool.query(`UPDATE orders SET created_at = now() - interval '40 days' WHERE id = $1`, [
      old,
    ]);
    await order([[soap, 1]]);

    const res = await request.get(api('/reports/products')).set(owner);
    expect(res.body.totals.quantity).toBe(1);
  });

  it('refuses a period that ends before it starts', async () => {
    const res = await request
      .get(api('/reports/products?from=2026-10-10&to=2026-10-01'))
      .set(owner);
    expect(res.status).toBe(422);
  });
});

describe('shop status colors', () => {
  it('are empty by default, then saved for the whole team', async () => {
    expect((await request.get(api()).set(owner)).body.statusColors).toEqual({});

    const res = await request
      .patch(api())
      .set(owner)
      .send({ statusColors: { LIVREE: 'emerald', PAID: 'pink' } });
    expect(res.status).toBe(200);
    expect(res.body.statusColors).toEqual({ LIVREE: 'emerald', PAID: 'pink' });

    const shops = await request.get('/api/v1/shops').set(cm);
    expect(shops.body[0].statusColors).toEqual({ LIVREE: 'emerald', PAID: 'pink' });
  });

  it('{} goes back to the defaults', async () => {
    await request
      .patch(api())
      .set(owner)
      .send({ statusColors: { PAID: 'pink' } });
    const res = await request.patch(api()).set(owner).send({ statusColors: {} });
    expect(res.body.statusColors).toEqual({});
  });

  it('refuses an unknown state or color', async () => {
    expect(
      (
        await request
          .patch(api())
          .set(owner)
          .send({ statusColors: { LIVREE: 'fuchsia' } })
      ).status,
    ).toBe(400);
    expect(
      (
        await request
          .patch(api())
          .set(owner)
          .send({ statusColors: { DONE: 'green' } })
      ).status,
    ).toBe(400);
  });

  it('only the owner can change them', async () => {
    const res = await request
      .patch(api())
      .set(cm)
      .send({ statusColors: { PAID: 'pink' } });
    expect(res.status).toBe(403);
  });
});
