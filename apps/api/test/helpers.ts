import supertest from 'supertest';

import { createApp } from '../src/app.js';
import type { TokenVerifier } from '../src/auth/firebase-auth.js';
import { pool } from '../src/db/pool.js';

// Test tokens are "test:<uid>"; anything else is rejected like a bad Firebase token.
const fakeVerifier: TokenVerifier = async (token) => {
  if (!token.startsWith('test:')) throw new Error('invalid token');
  const uid = token.slice('test:'.length);
  return { firebaseUid: uid, email: `${uid}@example.com`, emailVerified: true, name: null };
};

export const request = supertest(createApp({ verifyToken: fakeVerifier }));

export const auth = (uid: string) => ({ Authorization: `Bearer test:${uid}` });

export async function resetDatabase() {
  await pool.query(
    `TRUNCATE users, shops, products, customers, orders, order_items, expenses, stock_movements
     RESTART IDENTITY CASCADE`,
  );
}

export type Headers = Record<string, string>;

export async function createShop(user: Headers, name = 'Boutique'): Promise<string> {
  const res = await request.post('/api/v1/shops').set(user).send({ name });
  if (res.status !== 201) throw new Error(`createShop failed: ${res.status}`);
  return res.body.id;
}

export async function createProduct(
  user: Headers,
  shopId: string,
  body: Record<string, unknown> = {},
): Promise<{ id: string; stockQuantity: number }> {
  const res = await request
    .post(`/api/v1/shops/${shopId}/products`)
    .set(user)
    .send({ name: 'Savon coco', purchasePrice: 5000, sellingPrice: 9000, ...body });
  if (res.status !== 201) throw new Error(`createProduct failed: ${JSON.stringify(res.body)}`);
  return res.body;
}

export async function stockOf(user: Headers, shopId: string, productId: string): Promise<number> {
  const res = await request.get(`/api/v1/shops/${shopId}/products/${productId}`).set(user);
  return res.body.stockQuantity;
}
