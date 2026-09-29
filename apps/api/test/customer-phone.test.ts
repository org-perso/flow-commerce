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

describe('customer phone', () => {
  it('stores the normalized phone and finds it however it is typed', async () => {
    const res = await request
      .post(customers())
      .set(alice)
      .send({ name: 'Rakoto', phone: '+261 34 12 345 67' });
    expect(res.body.phone).toBe('0341234567');
    expect((await request.get(customers('?q=034 12')).set(alice)).body).toHaveLength(1);
    const international = encodeURIComponent('+261 34');
    expect((await request.get(customers(`?q=${international}`)).set(alice)).body).toHaveLength(1);
  });

  it('refuses a second customer with the same phone, pointing to the existing one', async () => {
    const first = await request
      .post(customers())
      .set(alice)
      .send({ name: 'Rakoto', phone: '0341234567' });
    const dup = await request
      .post(customers())
      .set(alice)
      .send({ name: 'Autre', phone: '034 12 345 67' });
    expect(dup.status).toBe(409);
    expect(dup.body).toMatchObject({ title: 'Duplicate Phone', customerId: first.body.id });

    const other = await request
      .post(customers())
      .set(alice)
      .send({ name: 'B', phone: '0320000000' });
    const patch = await request
      .patch(customers(`/${other.body.id}`))
      .set(alice)
      .send({ phone: '0341234567' });
    expect(patch.status).toBe(409);
  });

  it('allows the same phone in two different shops, and several customers without phone', async () => {
    const otherShop = await createShop(alice, 'Autre');
    await request.post(customers()).set(alice).send({ name: 'A', phone: '0341234567' });
    const res = await request
      .post(`/api/v1/shops/${otherShop}/customers`)
      .set(alice)
      .send({ name: 'A', phone: '0341234567' });
    expect(res.status).toBe(201);
    await request.post(customers()).set(alice).send({ name: 'Sans tel 1' });
    expect((await request.post(customers()).set(alice).send({ name: 'Sans tel 2' })).status).toBe(
      201,
    );
  });

  it('rejects a phone with too few digits', async () => {
    const res = await request.post(customers()).set(alice).send({ name: 'A', phone: '12' });
    expect(res.status).toBe(400);
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

  it('creates the customer with the order, and uses its address', async () => {
    const res = await order({ name: 'Rasoa', phone: '033 11 222 33', address: 'Ivandry' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      customer: { name: 'Rasoa', phone: '0331122233' },
      address: 'Ivandry',
    });
    expect((await request.get(customers()).set(alice)).body).toHaveLength(1);
  });

  it('reuses the existing customer with the same phone, without changing it', async () => {
    const first = await order({ name: 'Rasoa', phone: '0331122233', address: 'Ivandry' });
    const second = await order({ name: 'Rasoa H.', phone: '+261 33 11 222 33' });
    expect(second.body.customer.id).toBe(first.body.customer.id);
    expect(second.body.customer.name).toBe('Rasoa');
    expect(second.body.address).toBe('Ivandry');
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
