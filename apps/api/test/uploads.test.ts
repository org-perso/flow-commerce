import { beforeEach, describe, expect, it } from 'vitest';

import { pool } from '../src/db/pool.js';
import { sign } from '../src/modules/upload/cloudinary.js';
import { auth, createProduct, createShop, request, resetDatabase } from './helpers.js';

const owner = auth('owner');
const manager = auth('manager');
const cm = auth('cm');

let shopId: string;
const api = (path = '') => `/api/v1/shops/${shopId}${path}`;

beforeEach(async () => {
  await resetDatabase();
  shopId = await createShop(owner);
  for (const [uid, role] of [
    ['manager', 'MANAGER'],
    ['cm', 'CM'],
  ]) {
    await request.get('/api/v1/me').set(auth(uid!));
    await pool.query(
      `INSERT INTO shop_members (shop_id, user_id, role)
       SELECT $1, id, $3 FROM users WHERE firebase_uid = $2`,
      [shopId, uid, role],
    );
  }
});

describe('POST /shops/:shopId/uploads/signature', () => {
  it('signs an upload into the shop folder only', async () => {
    const res = await request.post(api('/uploads/signature')).set(owner).send({ kind: 'product' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      cloudName: 'flowco-test',
      apiKey: '123456789',
      folder: `flowco/shops/${shopId}/products`,
      uploadUrl: 'https://api.cloudinary.com/v1_1/flowco-test/image/upload',
    });
    expect(res.body.signature).toBe(
      sign({ folder: res.body.folder, timestamp: res.body.timestamp }, 'test-secret'),
    );
    expect(JSON.stringify(res.body)).not.toContain('test-secret');

    const logo = await request.post(api('/uploads/signature')).set(owner).send({ kind: 'logo' });
    expect(logo.body.folder).toBe(`flowco/shops/${shopId}/logo`);
  });

  it('same rights as saving the photo: products for a manager, the logo for the owner', async () => {
    const sig = (user: Record<string, string>, kind: string) =>
      request.post(api('/uploads/signature')).set(user).send({ kind });
    expect((await sig(manager, 'product')).status).toBe(200);
    expect((await sig(manager, 'logo')).status).toBe(403);
    expect((await sig(cm, 'product')).status).toBe(403);
  });

  it('only for members of the shop', async () => {
    const res = await request
      .post(api('/uploads/signature'))
      .set(auth('stranger'))
      .send({ kind: 'product' });
    expect(res.status).toBe(404);
  });
});

describe('shop logo', () => {
  const LOGO = 'https://res.cloudinary.com/flowco-test/image/upload/v1/flowco/shops/x/logo/a.jpg';

  it('is set, returned in the shop list, and removed with null', async () => {
    const set = await request.patch(api()).set(owner).send({ logo: LOGO });
    expect(set.status).toBe(200);
    expect(set.body.logo).toBe(LOGO);
    expect((await request.get('/api/v1/shops').set(owner)).body[0].logo).toBe(LOGO);

    const removed = await request.patch(api()).set(owner).send({ logo: null });
    expect(removed.body.logo).toBeNull();
  });

  it('older apps: a patch without logo keeps it', async () => {
    await request.patch(api()).set(owner).send({ logo: LOGO });
    const res = await request.patch(api()).set(owner).send({ name: 'Nouveau nom' });
    expect(res.body.logo).toBe(LOGO);
  });

  it('refuses a non-https URL', async () => {
    const res = await request.patch(api()).set(owner).send({ logo: 'http://example.com/a.jpg' });
    expect(res.status).toBe(400);
  });
});

describe('order lines', () => {
  it('carry the product photo, to recognize the item', async () => {
    const IMAGE = 'https://res.cloudinary.com/flowco-test/image/upload/v1/flowco/p.jpg';
    const withPhoto = await createProduct(owner, shopId, { image: IMAGE, initialStock: 5 });
    const without = await createProduct(owner, shopId, { name: 'Sans photo', initialStock: 5 });
    const res = await request
      .post(api('/orders'))
      .set(owner)
      .send({
        items: [
          { productId: withPhoto.id, quantity: 1 },
          { productId: without.id, quantity: 1 },
        ],
      });
    expect(res.status).toBe(201);
    const images = Object.fromEntries(
      res.body.items.map((i: { productId: string; productImage: string | null }) => [
        i.productId,
        i.productImage,
      ]),
    );
    expect(images).toEqual({ [withPhoto.id]: IMAGE, [without.id]: null });
  });
});
