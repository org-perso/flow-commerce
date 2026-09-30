import { beforeEach, describe, expect, it } from 'vitest';

import { auth, createProduct, createShop, request, resetDatabase } from './helpers.js';

const alice = auth('alice');
let shopId: string;

beforeEach(async () => {
  await resetDatabase();
  shopId = await createShop(alice);
});

describe('customers', () => {
  const url = (path = '') => `/api/v1/shops/${shopId}/customers${path}`;

  it('creates, searches by name or phone, updates', async () => {
    const created = await request
      .post(url())
      .set(alice)
      .send({ name: 'Rakoto Jean', phones: ['034 12 345 67'], socialProfile: 'Rakoto Jean FB' });
    expect(created.status).toBe(201);
    await request.post(url()).set(alice).send({ name: 'Rasoa Hanta' });

    expect((await request.get(url('?q=rakoto')).set(alice)).body).toHaveLength(1);
    expect((await request.get(url('?q=345')).set(alice)).body).toHaveLength(1);

    const updated = await request
      .patch(url(`/${created.body.id}`))
      .set(alice)
      .send({ phones: [] });
    expect(updated.body).toMatchObject({
      name: 'Rakoto Jean',
      phones: [],
      socialProfile: 'Rakoto Jean FB',
    });
  });

  it('deletes a customer without orders, keeps one with orders', async () => {
    const lonely = (await request.post(url()).set(alice).send({ name: 'A' })).body;
    expect((await request.delete(url(`/${lonely.id}`)).set(alice)).status).toBe(204);

    const buyer = (await request.post(url()).set(alice).send({ name: 'B' })).body;
    const product = await createProduct(alice, shopId);
    await request
      .post(`/api/v1/shops/${shopId}/orders`)
      .set(alice)
      .send({ customerId: buyer.id, items: [{ productId: product.id, quantity: 1 }] });
    expect((await request.delete(url(`/${buyer.id}`)).set(alice)).status).toBe(409);
  });
});

describe('expenses', () => {
  const url = (path = '') => `/api/v1/shops/${shopId}/expenses${path}`;

  it('defaults the date to today and filters by period and category', async () => {
    const today = await request
      .post(url())
      .set(alice)
      .send({ category: 'PUBLICITE', amount: 20000 });
    expect(today.status).toBe(201);
    expect(today.body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    await request
      .post(url())
      .set(alice)
      .send({ category: 'TRANSPORT', amount: 5000, date: '2026-01-15' });

    const january = await request.get(url('?from=2026-01-01&to=2026-01-31')).set(alice);
    expect(january.body).toMatchObject({ total: 5000, items: [{ category: 'TRANSPORT' }] });
    const ads = await request.get(url('?category=PUBLICITE')).set(alice);
    expect(ads.body.total).toBe(20000);
  });

  it('validates category and amount, updates and deletes', async () => {
    expect((await request.post(url()).set(alice).send({ category: 'X', amount: 1 })).status).toBe(
      400,
    );
    expect(
      (await request.post(url()).set(alice).send({ category: 'AUTRE', amount: 0 })).status,
    ).toBe(400);

    const expense = (await request.post(url()).set(alice).send({ category: 'AUTRE', amount: 1000 }))
      .body;
    const updated = await request
      .patch(url(`/${expense.id}`))
      .set(alice)
      .send({ amount: 1500 });
    expect(updated.body.amount).toBe(1500);
    expect((await request.delete(url(`/${expense.id}`)).set(alice)).status).toBe(204);
    expect((await request.get(url(`/${expense.id}`)).set(alice)).status).toBe(404);
  });
});
