import { beforeEach, describe, expect, it } from 'vitest';

import { businessToday } from '../src/config/time.js';
import { auth, createProduct, createShop, request, resetDatabase } from './helpers.js';

const alice = auth('alice');
let shopId: string;
let productId: string;
const api = (path: string) => `/api/v1/shops/${shopId}${path}`;

function day(days: number): string {
  const date = new Date(`${businessToday()}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const order = (body: object = {}) =>
  request
    .post(api('/orders'))
    .set(alice)
    .send({ items: [{ productId, quantity: 1 }], ...body });

const setStatus = (id: string, status: string) =>
  request
    .post(api(`/orders/${id}/status`))
    .set(alice)
    .send({ status });

beforeEach(async () => {
  await resetDatabase();
  shopId = await createShop(alice);
  productId = (await createProduct(alice, shopId, { name: 'Huile vegetal', initialStock: 10 })).id;
});

describe('order number', () => {
  it('numbers orders per shop, from 1', async () => {
    expect((await order()).body.number).toBe(1);
    expect((await order()).body.number).toBe(2);
    const other = await createShop(alice, 'Autre');
    const p = await createProduct(alice, other);
    const res = await request
      .post(`/api/v1/shops/${other}/orders`)
      .set(alice)
      .send({ items: [{ productId: p.id, quantity: 1 }] });
    expect(res.body.number).toBe(1);
  });

  it('gives distinct numbers to concurrent orders', async () => {
    const res = await Promise.all(Array.from({ length: 5 }, () => order()));
    expect(new Set(res.map((r) => r.body.number)).size).toBe(5);
  });
});

describe('order search', () => {
  it('finds by number, customer name, phone and product', async () => {
    const a = (await order({ customer: { name: 'Rasoa', phone: '0341234567' } })).body;
    const b = (await order()).body;
    const ids = async (q: string) =>
      (await request.get(api(`/orders?q=${encodeURIComponent(q)}`)).set(alice)).body.map(
        (o: { id: string }) => o.id,
      );
    expect(await ids('#2')).toEqual([b.id]);
    expect(await ids('1')).toEqual([a.id]);
    expect(await ids('raso')).toEqual([a.id]);
    expect(await ids('034 12')).toEqual([a.id]);
    expect((await ids('huile')).sort()).toEqual([a.id, b.id].sort());
    expect(await ids('rien')).toEqual([]);
  });
});

describe('order counts', () => {
  it('counts per status with the list filters', async () => {
    const a = (await order()).body;
    await order();
    await order({ scheduledDate: day(2) });
    await setStatus(a.id, 'CONFIRMEE');
    const today = await request.get(api('/orders/counts?when=today')).set(alice);
    expect(today.body).toEqual({ total: 2, byStatus: { EN_ATTENTE: 1, CONFIRMEE: 1 } });
    const all = await request.get(api('/orders/counts')).set(alice);
    expect(all.body.total).toBe(3);
  });
});

describe('dashboard', () => {
  it('gives rolling periods, margin rate, unpaid and overdue orders', async () => {
    const late = (await order({ scheduledDate: day(-1) })).body;
    const paid = (await order({ isPaid: true })).body;
    await setStatus(late.id, 'CONFIRMEE');
    await setStatus(paid.id, 'CONFIRMEE');
    const cancelled = (await order()).body;
    await setStatus(cancelled.id, 'ANNULEE');

    for (const period of ['7d', '30d']) {
      const res = await request.get(api(`/dashboard?period=${period}`)).set(alice);
      expect(res.status).toBe(200);
      expect(res.body.revenue).toBe(18000);
    }
    const res = await request.get(api('/dashboard?period=today')).set(alice);
    // 9000 sold for 5000: 44 % margin.
    expect(res.body.grossMarginRate).toBe(44);
    expect(res.body.unpaid).toEqual({ count: 1, amount: 9000 });
    expect(res.body.overdueOrders.map((o: { id: string }) => o.id)).toEqual([late.id]);
  });
});

describe('customer stats', () => {
  it('counts live orders and total spent, and orders without customer', async () => {
    const a = (await order({ customer: { name: 'Rasoa', phone: '0341234567' } })).body;
    const b = (await order({ customer: { name: 'Rasoa', phone: '0341234567' } })).body;
    await setStatus(b.id, 'ANNULEE');
    await order();
    const [customer] = (await request.get(api('/customers')).set(alice)).body;
    expect(customer).toMatchObject({ orderCount: 1, totalSpent: 9000 });
    expect(customer.lastOrderAt).toBe(a.createdAt);
    const unlinked = await request.get(api('/customers/unlinked-orders-count')).set(alice);
    expect(unlinked.body).toEqual({ count: 1 });
  });
});

describe('stock summary', () => {
  it('counts products and values the stock', async () => {
    const empty = await createProduct(alice, shopId, { name: 'Vide' });
    const archived = await createProduct(alice, shopId, { name: 'Vieux', initialStock: 3 });
    await request.delete(api(`/products/${archived.id}`)).set(alice);
    const res = await request.get(api('/products/summary')).set(alice);
    expect(res.body).toEqual({
      productCount: 2,
      units: 10,
      stockValue: 50000,
      stockSaleValue: 90000,
      lowStockCount: 1,
      outOfStockCount: 1,
      archivedCount: 1,
    });
    const out = await request.get(api('/products?outOfStock=true')).set(alice);
    expect(out.body.map((p: { id: string }) => p.id)).toEqual([empty.id]);
  });
});
