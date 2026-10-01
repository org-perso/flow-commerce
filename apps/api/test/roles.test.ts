import { beforeEach, describe, expect, it } from 'vitest';

import { pool } from '../src/db/pool.js';
import type { Role } from '../src/modules/shop/permissions.js';
import {
  auth,
  createProduct,
  createShop,
  request,
  resetDatabase,
  type Headers,
} from './helpers.js';

const owner = auth('owner');
const manager = auth('manager');
const cm = auth('cm');
const driver = auth('driver');
const stranger = auth('stranger');

/** Adds a member directly in the database (invitations come in their own tests). */
async function addMember(shopId: string, uid: string, role: Role) {
  await request.get('/api/v1/me').set(auth(uid));
  await pool.query(
    `INSERT INTO shop_members (shop_id, user_id, role)
     SELECT $1, id, $3 FROM users WHERE firebase_uid = $2`,
    [shopId, uid, role],
  );
}

let shopId: string;
let productId: string;
const api = (path = '') => `/api/v1/shops/${shopId}${path}`;

beforeEach(async () => {
  await resetDatabase();
  shopId = await createShop(owner);
  productId = (await createProduct(owner, shopId, { initialStock: 5 })).id;
  await addMember(shopId, 'manager', 'MANAGER');
  await addMember(shopId, 'cm', 'CM');
  await addMember(shopId, 'driver', 'DRIVER');
});

/** Status of the same request for owner, manager, CM and driver. */
async function statuses(send: (user: Headers) => Promise<{ status: number }>) {
  const results = [];
  for (const user of [owner, manager, cm, driver]) results.push((await send(user)).status);
  return results;
}

describe('shop membership', () => {
  it('lists the shop for every member, with their role', async () => {
    for (const [user, role] of [
      [owner, 'OWNER'],
      [cm, 'CM'],
      [driver, 'DRIVER'],
    ] as const) {
      const res = await request.get('/api/v1/shops').set(user);
      expect(res.body).toEqual([expect.objectContaining({ id: shopId, role })]);
    }
    const one = await request.get(api()).set(manager);
    expect(one.body).toMatchObject({ id: shopId, role: 'MANAGER' });
  });

  it('answers 404 to non-members', async () => {
    expect((await request.get(api()).set(stranger)).status).toBe(404);
    expect((await request.get(api('/orders')).set(stranger)).status).toBe(404);
  });
});

describe('rights per role (af-v2 §4)', () => {
  it('shop settings: owner only', async () => {
    expect(
      await statuses((u) => request.patch(api()).set(u).send({ name: 'Nouveau nom' })),
    ).toEqual([200, 403, 403, 403]);
  });

  it('dashboard and expenses: owner and manager', async () => {
    expect(await statuses((u) => request.get(api('/dashboard?period=today')).set(u))).toEqual([
      200, 200, 403, 403,
    ]);
    expect(await statuses((u) => request.get(api('/expenses')).set(u))).toEqual([
      200, 200, 403, 403,
    ]);
  });

  it('stock: CM reads, only owner and manager write', async () => {
    expect(await statuses((u) => request.get(api('/products')).set(u))).toEqual([
      200, 200, 200, 403,
    ]);
    expect(await statuses((u) => request.get(api('/categories')).set(u))).toEqual([
      200, 200, 200, 403,
    ]);
    expect(
      await statuses((u) =>
        request
          .post(api(`/products/${productId}/stock-movements`))
          .set(u)
          .send({
            type: 'AJOUT',
            quantity: 1,
          }),
      ),
    ).toEqual([201, 201, 403, 403]);
    expect(
      await statuses((u) =>
        request
          .patch(api(`/products/${productId}`))
          .set(u)
          .send({ sellingPrice: 1 }),
      ),
    ).toEqual([200, 200, 403, 403]);
    expect(
      await statuses((u) =>
        request
          .post(api('/categories'))
          .set(u)
          .send({ name: `Cat ${Math.random()}` }),
      ),
    ).toEqual([201, 201, 403, 403]);
  });

  it('customers and orders: owner, manager and CM', async () => {
    expect(
      await statuses((u) =>
        request.post(api('/customers')).set(u).send({ name: 'Rasoa', phones: [] }),
      ),
    ).toEqual([201, 201, 201, 403]);
    expect(
      await statuses((u) =>
        request
          .post(api('/orders'))
          .set(u)
          .send({ items: [{ productId, quantity: 1 }] }),
      ),
    ).toEqual([201, 201, 201, 403]);
  });

  it('CM can cancel an order', async () => {
    const order = await request
      .post(api('/orders'))
      .set(cm)
      .send({ items: [{ productId, quantity: 1 }] });
    const res = await request
      .post(api(`/orders/${order.body.id}/status`))
      .set(cm)
      .send({ status: 'ANNULEE' });
    expect(res.status).toBe(200);
  });
});

describe('costs are never sent to a CM (RG-60)', () => {
  it('hides purchase prices and stock values', async () => {
    const product = await request.get(api(`/products/${productId}`)).set(cm);
    expect(product.body.sellingPrice).toBe(9000);
    expect(product.body).not.toHaveProperty('purchasePrice');

    const list = await request.get(api('/products')).set(cm);
    expect(JSON.stringify(list.body)).not.toContain('purchasePrice');

    const summary = await request.get(api('/products/summary')).set(cm);
    expect(summary.body).not.toHaveProperty('stockValue');
    expect(summary.body).not.toHaveProperty('stockSaleValue');

    const order = await request
      .post(api('/orders'))
      .set(cm)
      .send({ items: [{ productId, quantity: 1 }] });
    expect(order.body.items[0].unitSellingPrice).toBe(9000);
    expect(order.body.items[0]).not.toHaveProperty('unitPurchasePrice');
  });

  it('still sends them to owner and manager', async () => {
    const product = await request.get(api(`/products/${productId}`)).set(manager);
    expect(product.body.purchasePrice).toBe(5000);
  });
});
