import { beforeEach, describe, expect, it } from 'vitest';

import { pool } from '../src/db/pool.js';
import type { Role } from '../src/modules/shop/permissions.js';
import { auth, createProduct, createShop, request, resetDatabase } from './helpers.js';

const owner = auth('owner');
const coOwner = auth('co-owner');
const driver = auth('driver');

const IMAGE = 'https://firebasestorage.googleapis.com/v0/b/b/o/shops%2Fx%2Fp.jpg?alt=media';

let shopId: string;
let productId: string;
const api = (path = '') => `/api/v1/shops/${shopId}${path}`;

async function addMember(uid: string, role: Role) {
  await request.get('/api/v1/me').set(auth(uid));
  await pool.query(
    `INSERT INTO shop_members (shop_id, user_id, role)
     SELECT $1, id, $3 FROM users WHERE firebase_uid = $2`,
    [shopId, uid, role],
  );
}

async function newOrder(): Promise<string> {
  const res = await request
    .post(api('/orders'))
    .set(owner)
    .send({
      items: [{ productId, quantity: 1 }],
      delivery: { place: 'Analakely' },
      status: 'CONFIRMEE',
    });
  expect(res.status).toBe(201);
  return res.body.id;
}

const count = async (sql: string, params: unknown[] = []) =>
  (await pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${sql}`, params)).rows[0]!.n;

const deleteAccount = (user: Record<string, string>) => request.delete('/api/v1/me').set(user);

beforeEach(async () => {
  await resetDatabase();
  shopId = await createShop(owner);
  productId = (await createProduct(owner, shopId, { image: IMAGE, initialStock: 5 })).id;
  await request.post(api('/invitations')).set(owner).send({ role: 'CM' });
});

describe('DELETE /me', () => {
  it('sole owner: deletes the shop with all its data, team included', async () => {
    await addMember('driver', 'DRIVER');
    const orderId = await newOrder();
    await request.post(api(`/orders/${orderId}/claim`)).set(driver);

    const res = await deleteAccount(owner);
    expect(res.status).toBe(200);
    expect(res.body.images).toEqual([IMAGE]);

    expect(await count('shops')).toBe(0);
    expect(await count('orders')).toBe(0);
    expect(await count('products')).toBe(0);
    expect(await count('users WHERE firebase_uid = $1', ['owner'])).toBe(0);
    // The driver keeps their account, without the shop.
    const shops = await request.get('/api/v1/shops').set(driver);
    expect(shops.body).toEqual([]);
  });

  it('with another owner: leaves, the shop and its data stay', async () => {
    await addMember('co-owner', 'OWNER');
    await newOrder();

    const res = await deleteAccount(owner);
    expect(res.status).toBe(200);
    expect(res.body.images).toEqual([]);

    const shop = await request.get(api()).set(coOwner);
    expect(shop.status).toBe(200);
    expect(await count('orders')).toBe(1);
    const { rows } = await pool.query(
      `SELECT u.firebase_uid FROM shops s JOIN users u ON u.id = s.owner_id WHERE s.id = $1`,
      [shopId],
    );
    expect(rows[0].firebase_uid).toBe('co-owner');
  });

  it('driver: leaves the shop, open deliveries go back to "à prendre"', async () => {
    await addMember('driver', 'DRIVER');
    const orderId = await newOrder();
    await request.post(api(`/orders/${orderId}/claim`)).set(driver);

    expect((await deleteAccount(driver)).status).toBe(200);

    const order = await request.get(api(`/orders/${orderId}`)).set(owner);
    expect(order.status).toBe(200);
    expect(order.body.driver).toBeNull();
    expect(await count('shop_members WHERE shop_id = $1', [shopId])).toBe(1);
  });

  it('a later sign-in starts again from an empty account', async () => {
    await deleteAccount(owner);
    const me = await request.get('/api/v1/me').set(owner);
    expect(me.status).toBe(200);
    expect((await request.get('/api/v1/shops').set(owner)).body).toEqual([]);
  });
});
