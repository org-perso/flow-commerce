import { beforeEach, describe, expect, it } from 'vitest';

import { pool } from '../src/db/pool.js';
import { auth, request, resetDatabase } from './helpers.js';

const alice = auth('alice');
const bob = auth('bob');

async function createShop(user: Record<string, string>, body: object = { name: 'Boutique' }) {
  const res = await request.post('/api/v1/shops').set(user).send(body);
  expect(res.status).toBe(201);
  return res.body as { id: string; name: string; description: string | null };
}

beforeEach(resetDatabase);

describe('authentication', () => {
  it('rejects requests without a token', async () => {
    const res = await request.get('/api/v1/shops');
    expect(res.status).toBe(401);
    expect(res.type).toBe('application/problem+json');
  });

  it('rejects invalid tokens', async () => {
    const res = await request.get('/api/v1/shops').set('Authorization', 'Bearer nope');
    expect(res.status).toBe(401);
  });

  it('creates the user on first request, once', async () => {
    await Promise.all([request.get('/api/v1/me').set(alice), request.get('/api/v1/me').set(alice)]);
    const res = await request.get('/api/v1/me').set(alice);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email: 'alice@example.com', name: null });
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM users');
    expect(rows[0].n).toBe(1);
  });

  it('updates the profile', async () => {
    const res = await request.patch('/api/v1/me').set(alice).send({ name: ' Alice ', phone: '' });
    expect(res.body).toMatchObject({ name: 'Alice', phone: null });
  });
});

describe('POST /shops', () => {
  it('creates a shop, trimming input', async () => {
    const res = await request
      .post('/api/v1/shops')
      .set(alice)
      .send({ name: '  Boutique Hery ', description: '  ' });
    expect(res.status).toBe(201);
    expect(res.headers.location).toBe(`/api/v1/shops/${res.body.id}`);
    expect(res.body).toMatchObject({ name: 'Boutique Hery', description: null });
  });

  it('lets a user own several shops', async () => {
    await createShop(alice, { name: 'Shop A' });
    await createShop(alice, { name: 'Shop B' });
    const res = await request.get('/api/v1/shops').set(alice);
    expect(res.body.map((s: { name: string }) => s.name)).toEqual(['Shop A', 'Shop B']);
  });

  it('validates the body', async () => {
    const res = await request.post('/api/v1/shops').set(alice).send({ name: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.errors[0].path).toBe('name');
  });
});

describe('shop isolation', () => {
  it('only lists my shops', async () => {
    await createShop(alice);
    const res = await request.get('/api/v1/shops').set(bob);
    expect(res.body).toEqual([]);
  });

  it("answers 404 for someone else's shop", async () => {
    const shop = await createShop(alice);
    expect((await request.get(`/api/v1/shops/${shop.id}`).set(bob)).status).toBe(404);
    const patch = await request.patch(`/api/v1/shops/${shop.id}`).set(bob).send({ name: 'Hacked' });
    expect(patch.status).toBe(404);
    expect((await request.get(`/api/v1/shops/${shop.id}`).set(alice)).body.name).toBe('Boutique');
  });

  it('answers 404 for a malformed shop id', async () => {
    expect((await request.get('/api/v1/shops/not-a-uuid').set(alice)).status).toBe(404);
  });
});

describe('PATCH /shops/:shopId', () => {
  it('updates only the provided fields', async () => {
    const shop = await createShop(alice, { name: 'Old', description: 'Desc' });
    const res = await request.patch(`/api/v1/shops/${shop.id}`).set(alice).send({ name: 'New' });
    expect(res.body).toMatchObject({ name: 'New', description: 'Desc' });
  });

  it('clears the description with null', async () => {
    const shop = await createShop(alice, { name: 'Shop', description: 'Desc' });
    const res = await request
      .patch(`/api/v1/shops/${shop.id}`)
      .set(alice)
      .send({ description: null });
    expect(res.body.description).toBeNull();
  });

  it('rejects an empty patch', async () => {
    const shop = await createShop(alice);
    const res = await request.patch(`/api/v1/shops/${shop.id}`).set(alice).send({});
    expect(res.status).toBe(400);
  });
});

describe('database guarantees', () => {
  it('forbids an order using a customer from another shop', async () => {
    const shopA = await createShop(alice);
    const shopB = await createShop(alice);
    const { rows } = await pool.query(
      `INSERT INTO customers (shop_id, name) VALUES ($1, 'Client B') RETURNING id`,
      [shopB.id],
    );
    await expect(
      pool.query(`INSERT INTO orders (shop_id, customer_id, number) VALUES ($1, $2, 1)`, [
        shopA.id,
        rows[0].id,
      ]),
    ).rejects.toMatchObject({ code: '23503' });
  });

  it('forbids negative stock and movements whose sign contradicts their type', async () => {
    const shop = await createShop(alice);
    const { rows } = await pool.query(
      `INSERT INTO products (shop_id, name, stock_quantity) VALUES ($1, 'Savon', 2) RETURNING id`,
      [shop.id],
    );
    const productId = rows[0].id;
    const decrement = await pool.query(
      `UPDATE products SET stock_quantity = stock_quantity - 3 WHERE id = $1 AND stock_quantity >= 3`,
      [productId],
    );
    expect(decrement.rowCount).toBe(0);
    await expect(
      pool.query(
        `INSERT INTO stock_movements (shop_id, product_id, type, quantity) VALUES ($1, $2, 'VENTE', 1)`,
        [shop.id, productId],
      ),
    ).rejects.toMatchObject({ code: '23514' });
  });
});
