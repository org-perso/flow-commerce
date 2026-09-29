import { beforeEach, describe, expect, it } from 'vitest';

import { auth, createProduct, createShop, request, resetDatabase, stockOf } from './helpers.js';

const alice = auth('alice');
const bob = auth('bob');
let shopId: string;
const url = (path = '') => `/api/v1/shops/${shopId}/products${path}`;

beforeEach(async () => {
  await resetDatabase();
  shopId = await createShop(alice);
});

describe('products', () => {
  it('creates a product with its initial stock recorded as a movement', async () => {
    const product = await createProduct(alice, shopId, { initialStock: 10, lowStockThreshold: 3 });
    expect(product).toMatchObject({ stockQuantity: 10, isLowStock: false, archivedAt: null });

    const movements = await request.get(url(`/${product.id}/stock-movements`)).set(alice);
    expect(movements.body).toMatchObject([
      { type: 'AJOUT', quantity: 10, reason: 'Stock initial' },
    ]);
  });

  it('rejects non-integer or negative amounts', async () => {
    const res = await request
      .post(url())
      .set(alice)
      .send({ name: 'X', purchasePrice: 10.5, sellingPrice: -1 });
    expect(res.status).toBe(400);
    expect(res.body.errors.map((e: { path: string }) => e.path).sort()).toEqual([
      'purchasePrice',
      'sellingPrice',
    ]);
  });

  it('cannot change the stock through PATCH', async () => {
    const product = await createProduct(alice, shopId);
    const res = await request
      .patch(url(`/${product.id}`))
      .set(alice)
      .send({ stockQuantity: 99 });
    expect(res.status).toBe(400);
  });

  it('updates fields and filters the list', async () => {
    const soap = await createProduct(alice, shopId, { category: 'Hygiène', initialStock: 1 });
    await createProduct(alice, shopId, { name: 'Thé hibiscus', initialStock: 50 });
    await request
      .patch(url(`/${soap.id}`))
      .set(alice)
      .send({ lowStockThreshold: 5 });

    const byName = await request.get(url('?q=thé')).set(alice);
    expect(byName.body.map((p: { name: string }) => p.name)).toEqual(['Thé hibiscus']);
    const low = await request.get(url('?lowStock=true')).set(alice);
    expect(low.body.map((p: { id: string }) => p.id)).toEqual([soap.id]);
    const byCategory = await request.get(url('?category=Hygiène')).set(alice);
    expect(byCategory.body).toHaveLength(1);
  });

  it('archives instead of deleting, and can restore', async () => {
    const product = await createProduct(alice, shopId);
    expect((await request.delete(url(`/${product.id}`)).set(alice)).status).toBe(204);
    expect((await request.get(url()).set(alice)).body).toEqual([]);
    expect((await request.get(url('?archived=true')).set(alice)).body).toHaveLength(1);

    const restored = await request.post(url(`/${product.id}/restore`)).set(alice);
    expect(restored.body.archivedAt).toBeNull();
  });

  it("hides another shop's products, even through my own shop id", async () => {
    const product = await createProduct(alice, shopId);
    const bobShop = await createShop(bob);
    const res = await request.get(`/api/v1/shops/${bobShop}/products/${product.id}`).set(bob);
    expect(res.status).toBe(404);
    expect((await request.get(url(`/${product.id}`)).set(bob)).status).toBe(404);
  });
});

describe('stock movements', () => {
  it('adds, removes and adjusts stock', async () => {
    const { id } = await createProduct(alice, shopId, { initialStock: 5 });
    const post = (body: object) =>
      request
        .post(url(`/${id}/stock-movements`))
        .set(alice)
        .send(body);

    expect((await post({ type: 'AJOUT', quantity: 10 })).body.stockQuantity).toBe(15);
    const removal = await post({ type: 'RETRAIT', quantity: 3, reason: 'Cassé' });
    expect(removal.body).toMatchObject({
      stockQuantity: 12,
      movement: { type: 'RETRAIT', quantity: -3, reason: 'Cassé' },
    });
    expect((await post({ type: 'AJUSTEMENT', quantity: -2 })).body.stockQuantity).toBe(10);
  });

  it('refuses to go below zero, without writing a movement', async () => {
    const { id } = await createProduct(alice, shopId, { initialStock: 2 });
    const res = await request
      .post(url(`/${id}/stock-movements`))
      .set(alice)
      .send({ type: 'RETRAIT', quantity: 3 });
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ title: 'Insufficient Stock', available: 2, requested: 3 });
    expect(await stockOf(alice, shopId, id)).toBe(2);
    const movements = await request.get(url(`/${id}/stock-movements`)).set(alice);
    expect(movements.body).toHaveLength(1);
  });

  it('reserves VENTE and RETOUR for orders and validates the sign', async () => {
    const { id } = await createProduct(alice, shopId);
    const post = (body: object) =>
      request
        .post(url(`/${id}/stock-movements`))
        .set(alice)
        .send(body);
    expect((await post({ type: 'VENTE', quantity: 1 })).status).toBe(400);
    expect((await post({ type: 'AJOUT', quantity: -1 })).status).toBe(400);
    expect((await post({ type: 'AJUSTEMENT', quantity: 0 })).status).toBe(400);
  });
});
