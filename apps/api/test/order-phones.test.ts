import { beforeEach, describe, expect, it } from 'vitest';

import { auth, createProduct, createShop, request, resetDatabase } from './helpers.js';

const owner = auth('owner');
let shopId: string;
let productId: string;
const api = (path = '') => `/api/v1/shops/${shopId}${path}`;

const order = (body: Record<string, unknown>) =>
  request
    .post(api('/orders'))
    .set(owner)
    .send({ items: [{ productId, quantity: 1 }], ...body });

beforeEach(async () => {
  await resetDatabase();
  shopId = await createShop(owner);
  productId = (await createProduct(owner, shopId, { initialStock: 50 })).id;
});

describe('order phones', () => {
  it('up to 3 numbers; the first one is the delivery number (older apps read it)', async () => {
    const res = await order({
      phones: ['034 12 345 67', '+261 32 98 765 43', '033 11 122 33'],
      delivery: { place: 'Analakely' },
    });
    expect(res.status).toBe(201);
    expect(res.body.phones).toEqual(['0341234567', '0329876543', '0331112233']);
    expect(res.body.delivery.phone).toBe('0341234567');
    expect(res.body.customer).toBeNull();
  });

  it('refuses a fourth number', async () => {
    const res = await order({ phones: ['0341111111', '0342222222', '0343333333', '0344444444'] });
    expect(res.status).toBe(400);
  });

  it('pickup: numbers kept without a delivery', async () => {
    const res = await order({ phones: ['0341234567'] });
    expect(res.body.delivery).toBeNull();
    expect(res.body.phones).toEqual(['0341234567']);
  });

  it('older apps: delivery.phone alone becomes the order number', async () => {
    const res = await order({ delivery: { place: 'Ivandry', phone: '0341234567' } });
    expect(res.body.phones).toEqual(['0341234567']);
  });

  it('saved customer: created with every number, then found by any of them', async () => {
    const first = await order({
      phones: ['0341234567', '0329876543'],
      customer: { name: 'Rakoto Jean', phones: ['0341234567', '0329876543'] },
    });
    const customerId = first.body.customer.id;

    // Found by the second number; the new number joins the card.
    const second = await order({
      phones: ['0329876543', '0331112233'],
      customer: { name: 'Autre nom', phones: ['0329876543', '0331112233'] },
    });
    expect(second.body.customer).toMatchObject({ id: customerId, name: 'Rakoto Jean' });
    const card = await request.get(api(`/customers/${customerId}`)).set(owner);
    expect(card.body.phones).toEqual(['0341234567', '0329876543', '0331112233']);
  });

  it('a number of another customer is never moved to this one', async () => {
    const a = await order({ customer: { name: 'A', phones: ['0341111111'] } });
    const b = await order({ customer: { name: 'B', phones: ['0342222222'] } });
    // B's number given with A's: A is matched first, B keeps its number.
    await order({ customer: { name: 'A', phones: ['0341111111', '0342222222'] } });
    const cardA = await request.get(api(`/customers/${a.body.customer.id}`)).set(owner);
    const cardB = await request.get(api(`/customers/${b.body.customer.id}`)).set(owner);
    expect(cardA.body.phones).toEqual(['0341111111']);
    expect(cardB.body.phones).toEqual(['0342222222']);
  });

  it('older apps: customer.phone still works', async () => {
    const res = await order({ customer: { name: 'Hanta', phone: '0345556677' } });
    expect(res.body.customer.name).toBe('Hanta');
    expect(res.body.phones).toEqual(['0345556677']);
  });

  it('edit: new list replaces; an older app changing delivery.phone keeps the others', async () => {
    const created = await order({
      phones: ['0341234567', '0329876543'],
      delivery: { place: 'Analakely' },
    });
    const id = created.body.id;

    const edited = await request
      .patch(api(`/orders/${id}`))
      .set(owner)
      .send({ phones: ['0331112233'] });
    expect(edited.body.phones).toEqual(['0331112233']);
    expect(edited.body.delivery.phone).toBe('0331112233');

    await request
      .patch(api(`/orders/${id}`))
      .set(owner)
      .send({ phones: ['0331112233', '0344445555'] });
    const legacy = await request
      .patch(api(`/orders/${id}`))
      .set(owner)
      .send({ delivery: { place: 'Analakely', phone: '0344445555' } });
    expect(legacy.body.phones).toEqual(['0344445555', '0331112233']);
    expect(legacy.body.delivery.phone).toBe('0344445555');
  });

  it('edit: saving the customer from the edit form', async () => {
    const created = await order({ phones: ['0341234567'] });
    const res = await request
      .patch(api(`/orders/${created.body.id}`))
      .set(owner)
      .send({ customer: { name: 'Rakoto', phones: ['0341234567'] } });
    expect(res.status).toBe(200);
    expect(res.body.customer.name).toBe('Rakoto');
  });

  it('search finds an order by any of its numbers', async () => {
    await order({ phones: ['0341234567', '0329876543'] });
    const res = await request.get(api('/orders?q=0329876543')).set(owner);
    expect(res.body).toHaveLength(1);
  });
});
