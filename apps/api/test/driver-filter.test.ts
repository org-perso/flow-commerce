import { beforeEach, describe, expect, it } from 'vitest';

import { pool } from '../src/db/pool.js';
import type { Role } from '../src/modules/shop/permissions.js';
import { auth, createProduct, createShop, request, resetDatabase } from './helpers.js';

const owner = auth('owner');
const cm = auth('cm');
const rado = auth('rado');

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

async function newOrder(delivery: object | null): Promise<string> {
  const res = await request
    .post(api('/orders'))
    .set(owner)
    .send({ items: [{ productId, quantity: 1 }], delivery, status: 'CONFIRMEE' });
  expect(res.status).toBe(201);
  return res.body.id;
}

beforeEach(async () => {
  await resetDatabase();
  shopId = await createShop(owner);
  productId = (await createProduct(owner, shopId, { initialStock: 20 })).id;
  await addMember('cm', 'CM');
  await addMember('rado', 'DRIVER');
});

describe('orders filtered by driver', () => {
  it("a driver's orders, or deliveries with no driver", async () => {
    const taken = await newOrder({ place: 'Analakely' });
    await request.post(api(`/orders/${taken}/claim`)).set(rado);
    const toTake = await newOrder({ place: 'Ivandry' });
    await newOrder(null); // pickup: never "without driver"

    const list = async (driverId: string) =>
      (await request.get(api(`/orders?driverId=${driverId}`)).set(cm)).body.map(
        (o: { id: string }) => o.id,
      );
    expect(await list(ids.rado!)).toEqual([taken]);
    expect(await list('none')).toEqual([toTake]);

    const counts = await request.get(api(`/orders/counts?driverId=${ids.rado}`)).set(cm);
    expect(counts.body.total).toBe(1);
  });

  it('works with the status filter and pagination', async () => {
    const a = await newOrder({ place: 'Analakely' });
    await request.post(api(`/orders/${a}/claim`)).set(rado);
    const res = await request
      .get(api(`/orders?driverId=${ids.rado}&status=CONFIRMEE&limit=10`))
      .set(owner);
    expect(res.body.map((o: { id: string }) => o.id)).toEqual([a]);
  });

  it('refuses anything else than an id or "none"', async () => {
    expect((await request.get(api('/orders?driverId=rado')).set(cm)).status).toBe(400);
  });
});
