import { beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_CATEGORIES } from '../src/modules/category/category.repository.js';
import { auth, createProduct, createShop, request, resetDatabase } from './helpers.js';

const alice = auth('alice');
const bob = auth('bob');
let shopId: string;
const categories = (id = shopId) => `/api/v1/shops/${id}/categories`;

beforeEach(async () => {
  await resetDatabase();
  shopId = await createShop(alice);
});

describe('product categories', () => {
  it('gives every new shop the standard list, "Autre" last', async () => {
    const res = await request.get(categories()).set(alice);
    expect(res.body).toHaveLength(DEFAULT_CATEGORIES.length);
    expect(res.body.at(-1).name).toBe('Autre');
  });

  it('adds a category, and refuses the same name in any case', async () => {
    const created = await request.post(categories()).set(alice).send({ name: 'Parfums' });
    expect(created.status).toBe(201);
    const dup = await request.post(categories()).set(alice).send({ name: '  parfums ' });
    expect(dup.status).toBe(409);
    expect(dup.body.categoryId).toBe(created.body.id);
  });

  it('links a product to a category and returns it', async () => {
    const { body } = await request.post(categories()).set(alice).send({ name: 'Parfums' });
    const product = await createProduct(alice, shopId, { categoryId: body.id });
    expect(product).toMatchObject({ category: { id: body.id, name: 'Parfums' } });
  });

  it("refuses another shop's category", async () => {
    const bobShop = await createShop(bob);
    const bobCategory = (await request.post(categories(bobShop)).set(bob).send({ name: 'X' })).body;
    const res = await request
      .post(`/api/v1/shops/${shopId}/products`)
      .set(alice)
      .send({ name: 'P', purchasePrice: 1, sellingPrice: 2, categoryId: bobCategory.id });
    expect(res.status).toBe(422);
    expect((await request.get(categories(bobShop)).set(alice)).status).toBe(404);
  });

  it('rejects the old free-text category field', async () => {
    const res = await request
      .post(`/api/v1/shops/${shopId}/products`)
      .set(alice)
      .send({ name: 'P', purchasePrice: 1, sellingPrice: 2, category: 'Hygiène' });
    expect(res.status).toBe(400);
  });
});

describe('order delivery and source', () => {
  let productId: string;
  const orders = (path = '') => `/api/v1/shops/${shopId}/orders${path}`;
  beforeEach(async () => {
    productId = (await createProduct(alice, shopId, { initialStock: 10, sellingPrice: 10000 })).id;
  });

  it('creates a delivered order with place, address, note and fee', async () => {
    const res = await request
      .post(orders())
      .set(alice)
      .send({
        source: 'MESSENGER',
        items: [{ productId, quantity: 1 }],
        delivery: { place: 'Analakely', address: 'Lot II A 12', note: 'Appeler avant', fee: 2000 },
      });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      source: 'MESSENGER',
      delivery: { place: 'Analakely', address: 'Lot II A 12', note: 'Appeler avant' },
      deliveryFee: 2000,
      totalAmount: 12000,
    });
  });

  it('creates a pickup order: no delivery, no fee', async () => {
    const res = await request
      .post(orders())
      .set(alice)
      .send({ items: [{ productId, quantity: 1 }] });
    expect(res.body).toMatchObject({ delivery: null, deliveryFee: 0, totalAmount: 10000 });
  });

  it('switching delivery off clears it and its fee', async () => {
    const order = (
      await request
        .post(orders())
        .set(alice)
        .send({ items: [{ productId, quantity: 1 }], delivery: { place: 'Ivandry', fee: 3000 } })
    ).body;
    const res = await request
      .patch(orders(`/${order.id}`))
      .set(alice)
      .send({ delivery: null });
    expect(res.body).toMatchObject({ delivery: null, deliveryFee: 0, totalAmount: 10000 });
  });

  it('updates the source and rejects unknown sources', async () => {
    const order = (
      await request
        .post(orders())
        .set(alice)
        .send({ items: [{ productId, quantity: 1 }], source: 'FACEBOOK' })
    ).body;
    const res = await request
      .patch(orders(`/${order.id}`))
      .set(alice)
      .send({ source: 'APPEL' });
    expect(res.body.source).toBe('APPEL');
    const bad = await request
      .post(orders())
      .set(alice)
      .send({ items: [{ productId, quantity: 1 }], source: 'PIGEON' });
    expect(bad.status).toBe(400);
  });

  it('rejects the old deliveryFee / address fields', async () => {
    const res = await request
      .post(orders())
      .set(alice)
      .send({ items: [{ productId, quantity: 1 }], deliveryFee: 3000, address: 'X' });
    expect(res.status).toBe(400);
  });
});
