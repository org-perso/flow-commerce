import { beforeEach, describe, expect, it } from 'vitest';

import { pool } from '../src/db/pool.js';
import type { Role } from '../src/modules/shop/permissions.js';
import { auth, createProduct, createShop, request, resetDatabase } from './helpers.js';

const owner = auth('owner');
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

/** A delivery taken by `driver`. */
async function delivery(driver: Record<string, string>): Promise<string> {
  const res = await request
    .post(api('/orders'))
    .set(owner)
    .send({
      items: [{ productId, quantity: 1 }],
      delivery: { place: 'Analakely' },
      status: 'CONFIRMEE',
    });
  expect(res.status).toBe(201);
  expect((await request.post(api(`/orders/${res.body.id}/claim`)).set(driver)).status).toBe(200);
  return res.body.id;
}

const setRoute = (user: Record<string, string>, orderIds: string[]) =>
  request.put(api('/deliveries/route')).set(user).send({ orderIds });

const positionOf = async (user: Record<string, string>, orderId: string) =>
  (await request.get(api(`/orders/${orderId}`)).set(user)).body.routePosition;

beforeEach(async () => {
  await resetDatabase();
  shopId = await createShop(owner);
  productId = (await createProduct(owner, shopId, { initialStock: 20 })).id;
  await addMember('rado', 'DRIVER');
  await addMember('tiana', 'DRIVER');
});

describe('PUT /deliveries/route', () => {
  it('numbers the round in the given order', async () => {
    const a = await delivery(rado);
    const b = await delivery(rado);
    const c = await delivery(rado);

    expect((await setRoute(rado, [c, a])).status).toBe(204);
    expect(await positionOf(rado, c)).toBe(1);
    expect(await positionOf(rado, a)).toBe(2);
    // Not placed: the app shows it under "À placer".
    expect(await positionOf(rado, b)).toBeNull();
  });

  it('an empty list goes back to the automatic order', async () => {
    const a = await delivery(rado);
    await setRoute(rado, [a]);
    expect((await setRoute(rado, [])).status).toBe(204);
    expect(await positionOf(rado, a)).toBeNull();
  });

  it("refuses another driver's order, and nothing changes", async () => {
    const mine = await delivery(rado);
    const hers = await delivery(tiana);
    await setRoute(rado, [mine]);

    expect((await setRoute(rado, [mine, hers])).status).toBe(404);
    expect(await positionOf(rado, mine)).toBe(1);
    expect(await positionOf(tiana, hers)).toBeNull();
  });

  it('refuses an order given twice', async () => {
    const a = await delivery(rado);
    expect((await setRoute(rado, [a, a])).status).toBe(422);
  });

  it('only for drivers', async () => {
    expect((await setRoute(owner, [])).status).toBe(403);
  });

  it('giving the delivery back clears its place', async () => {
    const a = await delivery(rado);
    await setRoute(rado, [a]);
    await request.post(api(`/orders/${a}/release`)).set(rado);
    await request.post(api(`/orders/${a}/claim`)).set(tiana);
    expect(await positionOf(tiana, a)).toBeNull();
  });

  it('a new driver assigned by the owner starts without a place', async () => {
    const a = await delivery(rado);
    await setRoute(rado, [a]);
    await request
      .put(api(`/orders/${a}/driver`))
      .set(owner)
      .send({ userId: ids.tiana });
    expect(await positionOf(tiana, a)).toBeNull();
  });
});
