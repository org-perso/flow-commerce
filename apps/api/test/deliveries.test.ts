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
const cm = auth('cm');
const rado = auth('rado');
const tiana = auth('tiana');

let shopId: string;
let productId: string;
const ids: Record<string, string> = {};
const api = (path = '') => `/api/v1/shops/${shopId}${path}`;

async function addMember(uid: string, role: Role) {
  await request.get('/api/v1/me').set(auth(uid));
  const { rows } = await pool.query(
    `INSERT INTO shop_members (shop_id, user_id, role)
     SELECT $1, id, $3 FROM users WHERE firebase_uid = $2 RETURNING user_id`,
    [shopId, uid, role],
  );
  ids[uid] = rows[0].user_id;
}

async function newOrder(delivery: object | null = { place: 'Analakely' }): Promise<string> {
  const res = await request
    .post(api('/orders'))
    .set(owner)
    .send({ items: [{ productId, quantity: 1 }], delivery, status: 'CONFIRMEE' });
  expect(res.status).toBe(201);
  return res.body.id;
}

const claim = (user: Headers, orderId: string) =>
  request.post(api(`/orders/${orderId}/claim`)).set(user);
const assign = (user: Headers, orderId: string, userId: string) =>
  request
    .put(api(`/orders/${orderId}/driver`))
    .set(user)
    .send({ userId });

beforeEach(async () => {
  await resetDatabase();
  shopId = await createShop(owner);
  productId = (await createProduct(owner, shopId, { initialStock: 20 })).id;
  await addMember('cm', 'CM');
  await addMember('rado', 'DRIVER');
  await addMember('tiana', 'DRIVER');
});

describe('assigning a driver (F-12, RG-54)', () => {
  it('owner, manager or CM assigns and unassigns a driver', async () => {
    const orderId = await newOrder();
    const res = await assign(cm, orderId, ids.rado!);
    expect(res.status).toBe(200);
    expect(res.body.driver).toEqual({ userId: ids.rado, name: 'rado@example.com' });
    const off = await request.delete(api(`/orders/${orderId}/driver`)).set(cm);
    expect(off.body.driver).toBeNull();
  });

  it('refuses a pickup order and a member who is not a driver', async () => {
    const pickup = await newOrder(null);
    expect((await assign(owner, pickup, ids.rado!)).body.code).toBe('NOT_A_DELIVERY');
    const orderId = await newOrder();
    const res = await assign(owner, orderId, ids.cm!);
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('NOT_A_DRIVER');
  });

  it('a driver cannot assign', async () => {
    const orderId = await newOrder();
    expect((await assign(rado, orderId, ids.tiana!)).status).toBe(403);
  });
});

describe('taking and giving back a delivery (RG-55)', () => {
  it('a driver takes an unassigned delivery; only the first of two gets it', async () => {
    const orderId = await newOrder();
    const [a, b] = await Promise.all([claim(rado, orderId), claim(tiana, orderId)]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    expect([a.body.code, b.body.code]).toContain('ALREADY_TAKEN');
  });

  it('cannot take a pickup order or one that is done', async () => {
    const pickup = await newOrder(null);
    expect((await claim(rado, pickup)).status).toBe(404);
    const done = await newOrder();
    await request
      .post(api(`/orders/${done}/status`))
      .set(owner)
      .send({ status: 'LIVREE' });
    expect((await claim(rado, done)).status).toBe(404);
  });

  it('gives a delivery back until it is delivered', async () => {
    const orderId = await newOrder();
    await claim(rado, orderId);
    expect((await request.post(api(`/orders/${orderId}/release`)).set(tiana)).status).toBe(404);
    const res = await request.post(api(`/orders/${orderId}/release`)).set(rado);
    expect(res.body.driver).toBeNull();

    await claim(rado, orderId);
    await request
      .post(api(`/orders/${orderId}/status`))
      .set(rado)
      .send({ status: 'LIVREE' });
    expect((await request.post(api(`/orders/${orderId}/release`)).set(rado)).status).toBe(409);
  });

  it('only drivers take deliveries', async () => {
    const orderId = await newOrder();
    expect((await claim(cm, orderId)).status).toBe(403);
  });
});

describe('driver space (F-13)', () => {
  it('sees their deliveries and the ones to take, nothing else', async () => {
    const mine = await newOrder();
    const available = await newOrder();
    const other = await newOrder();
    const pickup = await newOrder(null);
    await claim(rado, mine);
    await claim(tiana, other);

    const all = await request.get(api('/orders')).set(rado);
    expect(all.body.map((o: { id: string }) => o.id).sort()).toEqual([mine, available].sort());

    const onlyMine = await request.get(api('/orders?assignment=mine')).set(rado);
    expect(onlyMine.body.map((o: { id: string }) => o.id)).toEqual([mine]);
    const toTake = await request.get(api('/orders?assignment=available')).set(rado);
    expect(toTake.body.map((o: { id: string }) => o.id)).toEqual([available]);

    const counts = await request.get(api('/orders/counts')).set(rado);
    expect(counts.body.total).toBe(2);

    expect((await request.get(api(`/orders/${other}`)).set(rado)).status).toBe(404);
    expect((await request.get(api(`/orders/${pickup}`)).set(rado)).status).toBe(404);
    const detail = await request.get(api(`/orders/${mine}`)).set(rado);
    expect(detail.body.items[0]).not.toHaveProperty('unitPurchasePrice');
  });

  it('marks their delivery in delivery, delivered or returned; nothing else', async () => {
    const orderId = await newOrder();
    const other = await newOrder();
    await claim(rado, orderId);
    const status = (id: string, value: string) =>
      request
        .post(api(`/orders/${id}/status`))
        .set(rado)
        .send({ status: value });

    expect((await status(orderId, 'ANNULEE')).status).toBe(403);
    expect((await status(other, 'EN_LIVRAISON')).status).toBe(404);
    expect((await status(orderId, 'EN_LIVRAISON')).body.status).toBe('EN_LIVRAISON');
    expect((await status(orderId, 'RETOUR')).body.status).toBe('RETOUR');
  });

  it('collects payment on their delivery, and changes nothing else', async () => {
    const orderId = await newOrder();
    await claim(rado, orderId);
    const pay = await request
      .patch(api(`/orders/${orderId}`))
      .set(rado)
      .send({ isPaid: true, paymentMethod: 'Espèces' });
    expect(pay.body).toMatchObject({ isPaid: true, paymentMethod: 'Espèces' });

    const edit = await request
      .patch(api(`/orders/${orderId}`))
      .set(rado)
      .send({ items: [{ productId, quantity: 3 }] });
    expect(edit.status).toBe(400);
  });

  it('a driver cannot create orders nor read customers', async () => {
    expect(
      (
        await request
          .post(api('/orders'))
          .set(rado)
          .send({ items: [{ productId, quantity: 1 }] })
      ).status,
    ).toBe(403);
    expect((await request.get(api('/customers')).set(rado)).status).toBe(403);
  });
});
