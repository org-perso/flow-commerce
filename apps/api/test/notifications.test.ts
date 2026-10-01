import { beforeEach, describe, expect, it } from 'vitest';

import { pool } from '../src/db/pool.js';
import type { Role } from '../src/modules/shop/permissions.js';
import {
  auth,
  createProduct,
  createShop,
  request,
  resetDatabase,
  sentPushes,
  type Headers,
} from './helpers.js';

const owner = auth('owner');
const manager = auth('manager');
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

/** One device per user: token "token:<uid>". */
async function registerDevice(user: Headers, uid: string) {
  const res = await request
    .put('/api/v1/me/push-token')
    .set(user)
    .send({ token: `token:${uid}`, platform: 'android' });
  expect(res.status).toBe(204);
}

async function newOrder(delivery: object | null = { place: 'Analakely' }) {
  const res = await request
    .post(api('/orders'))
    .set(cm)
    .send({
      items: [{ productId, quantity: 1 }],
      delivery,
      status: 'CONFIRMEE',
      customer: { name: 'Rasoa', phone: null },
    });
  return res.body.id as string;
}

const assign = (orderId: string, uid: string) =>
  request
    .put(api(`/orders/${orderId}/driver`))
    .set(cm)
    .send({ userId: ids[uid] });
const pushesTo = (uid: string) => sentPushes.filter((p) => p.to === `token:${uid}`);

beforeEach(async () => {
  await resetDatabase();
  shopId = await createShop(owner, 'Boutique Hery');
  productId = (await createProduct(owner, shopId, { initialStock: 20, sellingPrice: 45000 })).id;
  for (const [uid, role] of [
    ['manager', 'MANAGER'],
    ['cm', 'CM'],
    ['rado', 'DRIVER'],
    ['tiana', 'DRIVER'],
  ] as const) {
    await addMember(uid, role);
  }
  for (const [user, uid] of [
    [owner, 'owner'],
    [manager, 'manager'],
    [cm, 'cm'],
    [rado, 'rado'],
    [tiana, 'tiana'],
  ] as const) {
    await registerDevice(user, uid);
  }
});

describe('"Notifier les livreurs" (F-17)', () => {
  it('sends nothing on assignment, then one grouped notification per driver', async () => {
    const [a, b, c] = [await newOrder(), await newOrder(), await newOrder()];
    await assign(a, 'rado');
    await assign(b, 'rado');
    await assign(c, 'tiana');
    expect(sentPushes).toEqual([]);

    const pending = await request.get(api('/deliveries/to-notify')).set(cm);
    expect(pending.body).toEqual({ orders: 3, drivers: 2 });

    const res = await request.post(api('/deliveries/notify')).set(cm);
    expect(res.body).toEqual({ orders: 3, drivers: 2 });
    expect(pushesTo('rado')).toEqual([
      expect.objectContaining({
        title: '🛵 2 nouvelles livraisons pour vous',
        body: 'Boutique Hery · Voir les détails',
        data: { type: 'deliveries', tab: 'mine', shopId },
      }),
    ]);
    expect(pushesTo('tiana')[0]!.title).toBe('🛵 Nouvelle livraison pour vous');
    expect(pushesTo('owner')).toEqual([]);
  });

  it('announces deliveries to take to every driver', async () => {
    await newOrder();
    await newOrder();
    await newOrder(null); // pickup: never announced
    await request.post(api('/deliveries/notify')).set(manager);
    for (const uid of ['rado', 'tiana']) {
      expect(pushesTo(uid)).toEqual([
        expect.objectContaining({ title: '📦 2 livraisons à prendre' }),
      ]);
    }
  });

  it('a second tap sends nothing again; a new assignment is announced again', async () => {
    const orderId = await newOrder();
    await assign(orderId, 'rado');
    await request.post(api('/deliveries/notify')).set(cm);
    sentPushes.length = 0;

    expect((await request.post(api('/deliveries/notify')).set(cm)).body).toEqual({
      orders: 0,
      drivers: 0,
    });
    expect(sentPushes).toEqual([]);

    await assign(orderId, 'tiana');
    expect((await request.get(api('/deliveries/to-notify')).set(cm)).body).toEqual({
      orders: 1,
      drivers: 1,
    });
  });

  it('a delivery a driver took himself is not announced', async () => {
    const orderId = await newOrder();
    await request.post(api(`/orders/${orderId}/claim`)).set(rado);
    expect((await request.get(api('/deliveries/to-notify')).set(cm)).body.orders).toBe(0);
  });

  it('never notifies someone who left the shop (RG-59)', async () => {
    await newOrder();
    await request.post(api('/leave')).set(tiana);
    await request.post(api('/deliveries/notify')).set(cm);
    expect(pushesTo('rado')).toHaveLength(1);
    expect(pushesTo('tiana')).toEqual([]);
  });

  it('drivers cannot send it', async () => {
    expect((await request.post(api('/deliveries/notify')).set(rado)).status).toBe(403);
  });
});

describe('driver actions notify owners and managers', () => {
  it('delivered and paid, right away', async () => {
    await request.patch('/api/v1/me').set(rado).send({ name: 'Rado' });
    const orderId = await newOrder();
    await assign(orderId, 'rado');

    await request
      .post(api(`/orders/${orderId}/status`))
      .set(rado)
      .send({ status: 'LIVREE' });
    await request
      .patch(api(`/orders/${orderId}`))
      .set(rado)
      .send({ isPaid: true, paymentMethod: 'MVola' });

    for (const uid of ['owner', 'manager']) {
      expect(pushesTo(uid).map((p) => p.body)).toEqual([
        'Rado a livré Rasoa · Analakely',
        'Rado a encaissé 45 000 Ar (MVola) · Rasoa · Analakely',
      ]);
      expect(pushesTo(uid)[0]!.data).toEqual({ type: 'order', shopId, orderId });
    }
    expect(pushesTo('cm')).toEqual([]);
    expect(pushesTo('rado')).toEqual([]);
  });

  it('nothing when the owner does it', async () => {
    const orderId = await newOrder();
    await request
      .post(api(`/orders/${orderId}/status`))
      .set(owner)
      .send({ status: 'LIVREE' });
    expect(sentPushes).toEqual([]);
  });
});

describe('push tokens', () => {
  it('removes tokens of uninstalled apps', async () => {
    await request
      .put('/api/v1/me/push-token')
      .set(rado)
      .send({ token: 'gone:rado', platform: 'android' });
    await newOrder();
    await request.post(api('/deliveries/notify')).set(cm);
    const { rows } = await pool.query('SELECT token FROM push_tokens WHERE token = $1', [
      'gone:rado',
    ]);
    expect(rows).toEqual([]);
  });

  it('a device stops receiving after sign-out', async () => {
    await request.delete('/api/v1/me/push-token').set(rado).send({ token: 'token:rado' });
    await newOrder();
    await request.post(api('/deliveries/notify')).set(cm);
    expect(pushesTo('rado')).toEqual([]);
    expect(pushesTo('tiana')).toHaveLength(1);
  });
});
