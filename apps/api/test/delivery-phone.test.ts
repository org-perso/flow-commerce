import { beforeEach, describe, expect, it } from 'vitest';

import { auth, createProduct, createShop, request, resetDatabase } from './helpers.js';

const owner = auth('owner');

let shopId: string;
let productId: string;
const api = (path = '') => `/api/v1/shops/${shopId}${path}`;

const newOrder = (delivery: object | null) =>
  request
    .post(api('/orders'))
    .set(owner)
    .send({ items: [{ productId, quantity: 1 }], delivery });

beforeEach(async () => {
  await resetDatabase();
  shopId = await createShop(owner);
  productId = (await createProduct(owner, shopId, { initialStock: 10 })).id;
});

describe('delivery phone (walk-in customer)', () => {
  it('is saved, normalised and returned with the delivery', async () => {
    const res = await newOrder({ place: 'Analakely', phone: '034 12 345 67' });
    expect(res.status).toBe(201);
    expect(res.body.delivery.phone).toBe('0341234567');
  });

  it('stays optional, for older apps', async () => {
    const res = await newOrder({ place: 'Analakely' });
    expect(res.status).toBe(201);
    expect(res.body.delivery.phone).toBeNull();
  });

  it('can be changed, and goes away with the delivery', async () => {
    const { body } = await newOrder({ place: 'Analakely', phone: '0341234567' });
    const edited = await request
      .patch(api(`/orders/${body.id}`))
      .set(owner)
      .send({ delivery: { place: 'Ivandry', phone: '0329876543' } });
    expect(edited.body.delivery.phone).toBe('0329876543');

    const pickup = await request
      .patch(api(`/orders/${body.id}`))
      .set(owner)
      .send({ delivery: null });
    expect(pickup.status).toBe(200);
    expect(pickup.body.delivery).toBeNull();
  });

  it('refuses a number too short', async () => {
    expect((await newOrder({ place: 'Analakely', phone: '123' })).status).toBe(400);
  });
});

describe('order search', () => {
  it('finds orders by delivery place, address or walk-in phone', async () => {
    await newOrder({ place: 'Analakely', address: 'Lot II A 45', phone: '0341234567' });
    await newOrder({ place: 'Ivandry' });

    const search = async (q: string) =>
      (await request.get(api(`/orders?q=${encodeURIComponent(q)}`)).set(owner)).body.length;
    expect(await search('analakely')).toBe(1);
    expect(await search('lot ii')).toBe(1);
    expect(await search('034 12 345')).toBe(1);
    expect(await search('ivandry')).toBe(1);

    const counts = await request.get(api('/orders/counts?q=analakely')).set(owner);
    expect(counts.body.total).toBe(1);
  });
});
