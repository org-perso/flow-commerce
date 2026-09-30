import { beforeEach, describe, expect, it } from 'vitest';

import { auth, createProduct, createShop, request, resetDatabase } from './helpers.js';

const alice = auth('alice');
let shopId: string;
let productId: string;
const orders = (path = '') => `/api/v1/shops/${shopId}/orders${path}`;

beforeEach(async () => {
  await resetDatabase();
  shopId = await createShop(alice);
  productId = (await createProduct(alice, shopId, { initialStock: 10 })).id;
});

const create = (extra: object = {}) =>
  request
    .post(orders())
    .set(alice)
    .send({ items: [{ productId, quantity: 1 }], ...extra });

describe('order payment', () => {
  it('is not paid by default', async () => {
    const res = await create();
    expect(res.body).toMatchObject({ isPaid: false, paidAt: null });
  });

  it('can be created as already paid', async () => {
    const res = await create({ isPaid: true });
    expect(res.body.isPaid).toBe(true);
    expect(res.body.paidAt).not.toBeNull();
  });

  it('is marked paid then unpaid, keeping the first payment time', async () => {
    const { body } = await create();
    const paid = await request
      .patch(orders(`/${body.id}`))
      .set(alice)
      .send({ isPaid: true });
    expect(paid.body.isPaid).toBe(true);
    const again = await request
      .patch(orders(`/${body.id}`))
      .set(alice)
      .send({ isPaid: true });
    expect(again.body.paidAt).toBe(paid.body.paidAt);
    const other = await request
      .patch(orders(`/${body.id}`))
      .set(alice)
      .send({ scheduledDate: '2030-01-01' });
    expect(other.body.isPaid).toBe(true);
    const unpaid = await request
      .patch(orders(`/${body.id}`))
      .set(alice)
      .send({ isPaid: false });
    expect(unpaid.body).toMatchObject({ isPaid: false, paidAt: null });
  });

  it('rejects a non-boolean value', async () => {
    const { body } = await create();
    const res = await request
      .patch(orders(`/${body.id}`))
      .set(alice)
      .send({ isPaid: 'yes' });
    expect(res.status).toBe(400);
  });
});
