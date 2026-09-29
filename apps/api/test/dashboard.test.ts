import { beforeEach, describe, expect, it } from 'vitest';

import { auth, createProduct, createShop, request, resetDatabase } from './helpers.js';

const alice = auth('alice');
let shopId: string;

beforeEach(async () => {
  await resetDatabase();
  shopId = await createShop(alice);
});

describe('dashboard', () => {
  it('computes revenue, margin and profit with the business rules', async () => {
    const soap = await createProduct(alice, shopId, {
      purchasePrice: 5000,
      sellingPrice: 9000,
      initialStock: 10,
      lowStockThreshold: 8,
    });
    const orders = `/api/v1/shops/${shopId}/orders`;
    const order = (status: string, quantity: number) =>
      request
        .post(orders)
        .set(alice)
        .send({ status, deliveryFee: 3000, items: [{ productId: soap.id, quantity }] });

    await order('CONFIRMEE', 2); // sale: 18 000 revenue, 10 000 cost
    await order('EN_ATTENTE', 5); // not a sale yet
    const cancelled = await order('CONFIRMEE', 1);
    await request
      .post(`${orders}/${cancelled.body.id}/status`)
      .set(alice)
      .send({ status: 'ANNULEE' });

    const expenses = `/api/v1/shops/${shopId}/expenses`;
    await request.post(expenses).set(alice).send({ category: 'PUBLICITE', amount: 2000 });
    await request.post(expenses).set(alice).send({ category: 'ACHAT_PRODUITS', amount: 50000 });

    const res = await request.get(`/api/v1/shops/${shopId}/dashboard?period=today`).set(alice);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      period: 'today',
      revenue: 18000, // delivery fees excluded
      costOfGoodsSold: 10000,
      grossMargin: 8000,
      expenses: 2000, // ACHAT_PRODUITS excluded
      productPurchases: 50000,
      estimatedProfit: 6000,
      salesCount: 1,
      ordersByStatus: { CONFIRMEE: 1, EN_ATTENTE: 1, ANNULEE: 1 },
      lowStockProducts: [{ id: soap.id, stockQuantity: 8 }],
    });
    expect(res.body.recentOrders).toHaveLength(3);
  });

  it('is empty for a new shop', async () => {
    const res = await request.get(`/api/v1/shops/${shopId}/dashboard?period=month`).set(alice);
    expect(res.body).toMatchObject({
      revenue: 0,
      estimatedProfit: 0,
      ordersByStatus: {},
      recentOrders: [],
    });
  });
});
