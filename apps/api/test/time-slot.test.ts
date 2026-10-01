import { beforeEach, describe, expect, it } from 'vitest';

import { pool } from '../src/db/pool.js';
import { auth, createProduct, createShop, request, resetDatabase } from './helpers.js';

const alice = auth('alice');
let shopId: string;
let productId: string;
const api = (path: string) => `/api/v1/shops/${shopId}${path}`;

const newOrder = (body: object = {}) =>
  request
    .post(api('/orders'))
    .set(alice)
    .send({ items: [{ productId, quantity: 1 }], ...body });

beforeEach(async () => {
  await resetDatabase();
  shopId = await createShop(alice);
  productId = (await createProduct(alice, shopId, { initialStock: 50 })).id;
});

describe('order time slot', () => {
  it('stores "before", "after" and "between"; none means any time', async () => {
    expect((await newOrder()).body.timeSlot).toBeNull();
    expect((await newOrder({ timeSlot: { to: '11:00' } })).body.timeSlot).toEqual({
      from: null,
      to: '11:00',
    });
    expect((await newOrder({ timeSlot: { from: '17:00' } })).body.timeSlot).toEqual({
      from: '17:00',
      to: null,
    });
    expect((await newOrder({ timeSlot: { from: '14:00', to: '16:30' } })).body.timeSlot).toEqual({
      from: '14:00',
      to: '16:30',
    });
    expect((await newOrder({ timeSlot: { from: null, to: null } })).body.timeSlot).toBeNull();
  });

  it('refuses a slot that ends before it starts, or a malformed hour', async () => {
    expect((await newOrder({ timeSlot: { from: '16:00', to: '14:00' } })).status).toBe(400);
    expect((await newOrder({ timeSlot: { to: '25:00' } })).status).toBe(400);
  });

  it('is changed or removed by PATCH, and kept when not sent', async () => {
    const { body } = await newOrder({ timeSlot: { from: '08:00', to: '12:00' } });
    const kept = await request
      .patch(api(`/orders/${body.id}`))
      .set(alice)
      .send({ source: 'APPEL' });
    expect(kept.body.timeSlot).toEqual({ from: '08:00', to: '12:00' });
    const moved = await request
      .patch(api(`/orders/${body.id}`))
      .set(alice)
      .send({ timeSlot: { to: '11:00' } });
    expect(moved.body.timeSlot).toEqual({ from: null, to: '11:00' });
    const removed = await request
      .patch(api(`/orders/${body.id}`))
      .set(alice)
      .send({ timeSlot: null });
    expect(removed.body.timeSlot).toBeNull();
  });

  it('within a day, the slot ending first comes first; "any time" last', async () => {
    const any = (await newOrder()).body.id;
    const evening = (await newOrder({ timeSlot: { from: '17:00' } })).body.id;
    const before11 = (await newOrder({ timeSlot: { to: '11:00' } })).body.id;
    const afternoon = (await newOrder({ timeSlot: { from: '14:00', to: '16:00' } })).body.id;
    const list = await request.get(api('/orders?when=today')).set(alice);
    expect(list.body.map((o: { id: string }) => o.id)).toEqual([before11, afternoon, evening, any]);
  });

  it('today, an open order whose slot has ended is overdue on the dashboard (RG-27)', async () => {
    const ended = (await newOrder({ timeSlot: { to: '00:30' } })).body.id;
    await newOrder({ timeSlot: { from: '23:00', to: '23:59' } });
    // The slot of "ended" is over unless the test runs between 00:00 and 00:30.
    const { rows } = await pool.query(
      `SELECT (now() AT TIME ZONE 'Indian/Antananarivo')::time >= '00:30' AS past`,
    );
    const res = await request.get(api('/dashboard?period=today')).set(alice);
    const overdue = res.body.overdueOrders.map((o: { id: string }) => o.id);
    expect(overdue).toEqual(rows[0].past ? [ended] : []);
  });
});
