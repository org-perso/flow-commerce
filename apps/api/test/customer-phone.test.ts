import { beforeEach, describe, expect, it } from 'vitest';

import { normalizePhone } from '../src/modules/customer/phone.js';
import { auth, createProduct, createShop, request, resetDatabase } from './helpers.js';

const alice = auth('alice');
let shopId: string;
const customers = (path = '') => `/api/v1/shops/${shopId}/customers${path}`;
const orders = () => `/api/v1/shops/${shopId}/orders`;

beforeEach(async () => {
  await resetDatabase();
  shopId = await createShop(alice);
});

describe('normalizePhone', () => {
  it.each([
    ['034 12 345 67', '0341234567'],
    ['+261 34 12 345 67', '0341234567'],
    ['261341234567', '0341234567'],
    ['034-12.345.67', '0341234567'],
    ['   ', null],
    [null, null],
  ])('%s → %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });
});

describe('customer phones', () => {
  it('stores several normalized phones, main one first, without duplicates', async () => {
    const res = await request
      .post(customers())
      .set(alice)
      .send({ name: 'Rakoto', phones: ['+261 34 12 345 67', '032 00 000 00', '0341234567', ''] });
    expect(res.status).toBe(201);
    expect(res.body.phones).toEqual(['0341234567', '0320000000']);
  });

  it('finds a customer by any of its phones, however it is typed', async () => {
    await request
      .post(customers())
      .set(alice)
      .send({ name: 'Rakoto', phones: ['0341234567', '0320000000'] });
    expect((await request.get(customers('?q=032 00')).set(alice)).body).toHaveLength(1);
    const international = encodeURIComponent('+261 34');
    expect((await request.get(customers(`?q=${international}`)).set(alice)).body).toHaveLength(1);
  });

  it('refuses a phone already used by another customer, pointing to it', async () => {
    const first = await request
      .post(customers())
      .set(alice)
      .send({ name: 'Rakoto', phones: ['0341234567'] });
    const dup = await request
      .post(customers())
      .set(alice)
      .send({ name: 'Autre', phones: ['0330000000', '034 12 345 67'] });
    expect(dup.status).toBe(409);
    expect(dup.body).toMatchObject({ title: 'Duplicate Phone', customerId: first.body.id });

    const other = await request.post(customers()).set(alice).send({ name: 'B' });
    const patch = await request
      .patch(customers(`/${other.body.id}`))
      .set(alice)
      .send({ phones: ['0341234567'] });
    expect(patch.status).toBe(409);
  });

  it('replaces the phone list on update, keeping the kept numbers', async () => {
    const c = await request
      .post(customers())
      .set(alice)
      .send({ name: 'Rakoto', phones: ['0341234567', '0320000000'] });
    const res = await request
      .patch(customers(`/${c.body.id}`))
      .set(alice)
      .send({ phones: ['0320000000', '0330000000'] });
    expect(res.body.phones).toEqual(['0320000000', '0330000000']);
    // The removed number is free again.
    const reuse = await request
      .post(customers())
      .set(alice)
      .send({ name: 'Autre', phones: ['0341234567'] });
    expect(reuse.status).toBe(201);
  });

  it('allows the same phone in two different shops', async () => {
    const otherShop = await createShop(alice, 'Autre');
    await request
      .post(customers())
      .set(alice)
      .send({ name: 'A', phones: ['0341234567'] });
    const res = await request
      .post(`/api/v1/shops/${otherShop}/customers`)
      .set(alice)
      .send({ name: 'A', phones: ['0341234567'] });
    expect(res.status).toBe(201);
  });

  it('rejects invalid phones and the removed fields', async () => {
    expect(
      (
        await request
          .post(customers())
          .set(alice)
          .send({ name: 'A', phones: ['12'] })
      ).status,
    ).toBe(400);
    expect(
      (await request.post(customers()).set(alice).send({ name: 'A', address: 'Ivandry' })).status,
    ).toBe(400);
  });
});

describe('social profile', () => {
  it('stores it and finds the customer by it', async () => {
    const res = await request
      .post(customers())
      .set(alice)
      .send({ name: 'Rasoa', socialProfile: 'fb.com/rasoa.hanta' });
    expect(res.body.socialProfile).toBe('fb.com/rasoa.hanta');
    expect((await request.get(customers('?q=rasoa.hanta')).set(alice)).body).toHaveLength(1);
    const cleared = await request
      .patch(customers(`/${res.body.id}`))
      .set(alice)
      .send({ socialProfile: '' });
    expect(cleared.body.socialProfile).toBeNull();
  });
});

describe('customer typed in the order', () => {
  let productId: string;
  beforeEach(async () => {
    productId = (await createProduct(alice, shopId, { initialStock: 10 })).id;
  });
  const order = (customer: object) =>
    request
      .post(orders())
      .set(alice)
      .send({ customer, items: [{ productId, quantity: 1 }] });

  it('creates the customer with the order', async () => {
    const res = await order({ name: 'Rasoa', phone: '033 11 222 33' });
    expect(res.status).toBe(201);
    expect(res.body.customer).toMatchObject({ name: 'Rasoa', phone: '0331122233' });
    const list = (await request.get(customers()).set(alice)).body;
    expect(list).toMatchObject([{ name: 'Rasoa', phones: ['0331122233'] }]);
  });

  it('reuses the customer owning this phone, even as a secondary number', async () => {
    const existing = await request
      .post(customers())
      .set(alice)
      .send({ name: 'Rasoa', phones: ['0320000000', '0331122233'] });
    const res = await order({ name: 'Rasoa H.', phone: '+261 33 11 222 33' });
    expect(res.body.customer).toMatchObject({ id: existing.body.id, name: 'Rasoa' });
    // The order shows the main number.
    expect(res.body.customer.phone).toBe('0320000000');
    expect((await request.get(customers()).set(alice)).body).toHaveLength(1);
  });

  it('does not duplicate the customer on concurrent orders', async () => {
    await Promise.all(Array.from({ length: 5 }, () => order({ name: 'X', phone: '0340000000' })));
    expect((await request.get(customers()).set(alice)).body).toHaveLength(1);
  });

  it('refuses customerId and customer together', async () => {
    const existing = await request.post(customers()).set(alice).send({ name: 'A' });
    const res = await request
      .post(orders())
      .set(alice)
      .send({
        customerId: existing.body.id,
        customer: { name: 'B' },
        items: [{ productId, quantity: 1 }],
      });
    expect(res.status).toBe(400);
  });
});
