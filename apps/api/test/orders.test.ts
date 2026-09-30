import { beforeEach, describe, expect, it } from 'vitest';

import { auth, createProduct, createShop, request, resetDatabase, stockOf } from './helpers.js';

const alice = auth('alice');
let shopId: string;
let soap: { id: string };
let tea: { id: string };

const url = (path = '') => `/api/v1/shops/${shopId}/orders${path}`;
const setStatus = (orderId: string, status: string) =>
  request
    .post(url(`/${orderId}/status`))
    .set(alice)
    .send({ status });

beforeEach(async () => {
  await resetDatabase();
  shopId = await createShop(alice);
  soap = await createProduct(alice, shopId, {
    name: 'Savon coco',
    purchasePrice: 5000,
    sellingPrice: 9000,
    initialStock: 10,
  });
  tea = await createProduct(alice, shopId, {
    name: 'Thé hibiscus',
    purchasePrice: 8000,
    sellingPrice: 15000,
    initialStock: 5,
  });
});

async function createOrder(body: Record<string, unknown> = {}) {
  const res = await request
    .post(url())
    .set(alice)
    .send({
      items: [
        { productId: soap.id, quantity: 2 },
        { productId: tea.id, quantity: 3 },
      ],
      delivery: { place: 'Analakely', fee: 3000 },
      ...body,
    });
  expect(res.status).toBe(201);
  return res.body;
}

describe('creating orders', () => {
  it('freezes prices and computes amounts; delivery is separate from items', async () => {
    const order = await createOrder();
    expect(order).toMatchObject({
      status: 'EN_ATTENTE',
      itemsAmount: 2 * 9000 + 3 * 15000,
      delivery: { place: 'Analakely', address: null, note: null },
      deliveryFee: 3000,
      totalAmount: 63000 + 3000,
    });
    expect(order.items).toMatchObject([
      {
        productName: 'Savon coco',
        quantity: 2,
        unitSellingPrice: 9000,
        unitPurchasePrice: 5000,
        subtotal: 18000,
      },
      { productName: 'Thé hibiscus', quantity: 3, unitSellingPrice: 15000, subtotal: 45000 },
    ]);

    // Changing the product price later does not change the order.
    await request
      .patch(`/api/v1/shops/${shopId}/products/${soap.id}`)
      .set(alice)
      .send({ sellingPrice: 1 });
    const again = await request.get(url(`/${order.id}`)).set(alice);
    expect(again.body.items[0].unitSellingPrice).toBe(9000);
  });

  it('merges duplicate lines', async () => {
    const order = await createOrder({
      items: [
        { productId: soap.id, quantity: 1 },
        { productId: soap.id, quantity: 2 },
      ],
    });
    expect(order.items).toMatchObject([{ quantity: 3, subtotal: 27000 }]);
  });

  it('does not take stock while pending', async () => {
    await createOrder();
    expect(await stockOf(alice, shopId, soap.id)).toBe(10);
  });

  it('takes stock when created as confirmed', async () => {
    await createOrder({ status: 'CONFIRMEE' });
    expect(await stockOf(alice, shopId, soap.id)).toBe(8);
    expect(await stockOf(alice, shopId, tea.id)).toBe(2);
  });

  it('rejects archived products, products and customers of another shop', async () => {
    await request.delete(`/api/v1/shops/${shopId}/products/${tea.id}`).set(alice);
    const archived = await request
      .post(url())
      .set(alice)
      .send({ items: [{ productId: tea.id, quantity: 1 }] });
    expect(archived.status).toBe(422);
    expect(archived.body.productIds).toEqual([tea.id]);

    const otherShop = await createShop(alice, 'Autre');
    const foreign = await createProduct(alice, otherShop);
    const res = await request
      .post(url())
      .set(alice)
      .send({ items: [{ productId: foreign.id, quantity: 1 }] });
    expect(res.status).toBe(422);

    const foreignCustomer = await request
      .post(`/api/v1/shops/${otherShop}/customers`)
      .set(alice)
      .send({ name: 'X' });
    const res2 = await request
      .post(url())
      .set(alice)
      .send({ customerId: foreignCustomer.body.id, items: [{ productId: soap.id, quantity: 1 }] });
    expect(res2.status).toBe(422);
  });

  it('rolls everything back when stock is insufficient', async () => {
    const res = await request
      .post(url())
      .set(alice)
      .send({
        status: 'CONFIRMEE',
        items: [
          { productId: soap.id, quantity: 1 },
          { productId: tea.id, quantity: 99 },
        ],
      });
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ productId: tea.id, available: 5 });
    expect(await stockOf(alice, shopId, soap.id)).toBe(10);
    expect((await request.get(url()).set(alice)).body).toEqual([]);
  });
});

describe('order lifecycle and stock', () => {
  it('takes stock on confirmation and gives it back on cancellation', async () => {
    const order = await createOrder();
    expect((await setStatus(order.id, 'CONFIRMEE')).body.status).toBe('CONFIRMEE');
    expect(await stockOf(alice, shopId, soap.id)).toBe(8);

    await setStatus(order.id, 'EN_LIVRAISON');
    expect(await stockOf(alice, shopId, soap.id)).toBe(8);

    await setStatus(order.id, 'ANNULEE');
    expect(await stockOf(alice, shopId, soap.id)).toBe(10);
    expect(await stockOf(alice, shopId, tea.id)).toBe(5);

    const movements = await request
      .get(`/api/v1/shops/${shopId}/products/${soap.id}/stock-movements`)
      .set(alice);
    expect(
      movements.body.map((m: { type: string; quantity: number }) => [m.type, m.quantity]),
    ).toEqual([
      ['RETOUR', 2],
      ['VENTE', -2],
      ['AJOUT', 10],
    ]);
  });

  it('cancelling a pending order does not touch stock', async () => {
    const order = await createOrder();
    await setStatus(order.id, 'ANNULEE');
    expect(await stockOf(alice, shopId, soap.id)).toBe(10);
  });

  it('a return after delivery gives the stock back', async () => {
    const order = await createOrder({ status: 'CONFIRMEE' });
    await setStatus(order.id, 'LIVREE');
    await setStatus(order.id, 'RETOUR');
    expect(await stockOf(alice, shopId, tea.id)).toBe(5);
  });

  it('refuses invalid transitions', async () => {
    const order = await createOrder();
    const res = await setStatus(order.id, 'LIVREE');
    expect(res.status).toBe(409);
    expect(res.body.allowed).toEqual(['CONFIRMEE', 'ANNULEE']);

    await setStatus(order.id, 'ANNULEE');
    expect((await setStatus(order.id, 'CONFIRMEE')).status).toBe(409);
  });

  it('refuses confirmation when stock ran out meanwhile', async () => {
    const first = await createOrder({ items: [{ productId: tea.id, quantity: 4 }] });
    const second = await createOrder({ items: [{ productId: tea.id, quantity: 4 }] });
    await setStatus(first.id, 'CONFIRMEE');
    const res = await setStatus(second.id, 'CONFIRMEE');
    expect(res.status).toBe(409);
    expect((await request.get(url(`/${second.id}`)).set(alice)).body.status).toBe('EN_ATTENTE');
  });

  it('confirms concurrent orders without overselling', async () => {
    const orders = await Promise.all(
      Array.from({ length: 5 }, () => createOrder({ items: [{ productId: tea.id, quantity: 2 }] })),
    );
    const results = await Promise.all(orders.map((o) => setStatus(o.id, 'CONFIRMEE')));
    expect(results.filter((r) => r.status === 200)).toHaveLength(2);
    expect(await stockOf(alice, shopId, tea.id)).toBe(1);
  });
});

describe('editing orders', () => {
  it('re-prices items while pending and recomputes the total', async () => {
    const order = await createOrder();
    const res = await request
      .patch(url(`/${order.id}`))
      .set(alice)
      .send({ items: [{ productId: soap.id, quantity: 1 }], delivery: null });
    expect(res.body).toMatchObject({ itemsAmount: 9000, deliveryFee: 0, totalAmount: 9000 });
  });

  it('locks items once confirmed but allows the other fields', async () => {
    const order = await createOrder({ status: 'CONFIRMEE' });
    const items = await request
      .patch(url(`/${order.id}`))
      .set(alice)
      .send({ items: [{ productId: soap.id, quantity: 1 }] });
    expect(items.status).toBe(409);

    const fee = await request
      .patch(url(`/${order.id}`))
      .set(alice)
      .send({ delivery: { place: 'Ivandry', fee: 5000 }, paymentMethod: 'MVola' });
    expect(fee.body).toMatchObject({
      deliveryFee: 5000,
      totalAmount: 63000 + 5000,
      paymentMethod: 'MVola',
    });
  });
});

describe('listing orders', () => {
  it('filters by status and paginates, newest first', async () => {
    const a = await createOrder();
    const b = await createOrder();
    await setStatus(a.id, 'ANNULEE');

    expect(
      (await request.get(url('?status=EN_ATTENTE')).set(alice)).body.map(
        (o: { id: string }) => o.id,
      ),
    ).toEqual([b.id]);
    const page = await request.get(url('?limit=1&offset=1')).set(alice);
    expect(page.body.map((o: { id: string }) => o.id)).toEqual([a.id]);
  });
});
