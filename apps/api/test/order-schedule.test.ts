import { beforeEach, describe, expect, it } from 'vitest';

import { businessToday } from '../src/config/time.js';
import { auth, createProduct, createShop, request, resetDatabase } from './helpers.js';

const alice = auth('alice');
let shopId: string;
let productId: string;
const orders = (path = '') => `/api/v1/shops/${shopId}/orders${path}`;

/** Business date shifted by `days` (YYYY-MM-DD). */
function day(days: number): string {
  const date = new Date(`${businessToday()}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function order(scheduledDate?: string, status?: string) {
  const res = await request
    .post(orders())
    .set(alice)
    .send({ items: [{ productId, quantity: 1 }], ...(scheduledDate && { scheduledDate }) });
  expect(res.status).toBe(201);
  if (status) {
    await request
      .post(orders(`/${res.body.id}/status`))
      .set(alice)
      .send({ status: 'CONFIRMEE' });
    if (status !== 'CONFIRMEE') {
      await request
        .post(orders(`/${res.body.id}/status`))
        .set(alice)
        .send({ status });
    }
  }
  return res.body as { id: string; scheduledDate: string };
}

const ids = async (query: string) =>
  (await request.get(orders(query)).set(alice)).body.map((o: { id: string }) => o.id);

beforeEach(async () => {
  await resetDatabase();
  shopId = await createShop(alice);
  productId = (await createProduct(alice, shopId, { initialStock: 100 })).id;
});

describe('scheduled date', () => {
  it('defaults to today in Madagascar', async () => {
    expect((await order()).scheduledDate).toBe(businessToday());
  });

  it('can be set on creation and changed later', async () => {
    const o = await order(day(2));
    expect(o.scheduledDate).toBe(day(2));
    const res = await request
      .patch(orders(`/${o.id}`))
      .set(alice)
      .send({ scheduledDate: day(5) });
    expect(res.body.scheduledDate).toBe(day(5));
  });

  it('rejects an invalid date', async () => {
    const res = await request
      .post(orders())
      .set(alice)
      .send({ items: [{ productId, quantity: 1 }], scheduledDate: '31/12/2026' });
    expect(res.status).toBe(400);
  });
});

describe('today / upcoming views', () => {
  it('today: planned today plus overdue open orders; upcoming: planned later', async () => {
    const today = await order();
    const tomorrow = await order(day(1));
    const nextWeek = await order(day(7));
    const overdue = await order(day(-2)); // still pending
    const overdueDone = await order(day(-2), 'LIVREE');
    const overdueCancelled = await order(day(-3), 'ANNULEE');

    const todayIds = await ids('?when=today');
    expect(todayIds).toEqual([overdue.id, today.id]); // overdue first
    expect(todayIds).not.toContain(overdueDone.id);
    expect(todayIds).not.toContain(overdueCancelled.id);

    expect(await ids('?when=upcoming')).toEqual([tomorrow.id, nextWeek.id]);
    expect(await ids('')).toHaveLength(6);
  });

  it('combines with the status filter', async () => {
    await order();
    const confirmed = await order(undefined, 'CONFIRMEE');
    expect(await ids('?when=today&status=CONFIRMEE')).toEqual([confirmed.id]);
  });
});
