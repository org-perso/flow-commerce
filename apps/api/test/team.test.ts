import { beforeEach, describe, expect, it } from 'vitest';

import { pool } from '../src/db/pool.js';
import {
  auth,
  createProduct,
  createShop,
  request,
  resetDatabase,
  type Headers,
} from './helpers.js';

const owner = auth('owner');
const manager = auth('manager');
const cm = auth('cm');
const driver = auth('driver');
const newcomer = auth('newcomer');

let shopId: string;
const api = (path = '') => `/api/v1/shops/${shopId}${path}`;

async function invite(by: Headers, role: string) {
  return request.post(api('/invitations')).set(by).send({ role });
}

/** Invites with the owner, then joins with `user`. */
async function join(user: Headers, role: string) {
  const { body } = await invite(owner, role);
  const res = await request.post('/api/v1/invitations/join').set(user).send({ code: body.code });
  expect(res.status).toBe(201);
}

async function userId(uid: string): Promise<string> {
  const { rows } = await pool.query('SELECT id FROM users WHERE firebase_uid = $1', [uid]);
  return rows[0].id;
}

beforeEach(async () => {
  await resetDatabase();
  shopId = await createShop(owner);
  await join(manager, 'MANAGER');
  await join(cm, 'CM');
  await join(driver, 'DRIVER');
});

describe('invitations', () => {
  it('creates a 6-character code valid 7 days', async () => {
    const res = await invite(owner, 'CM');
    expect(res.status).toBe(201);
    expect(res.body.code).toMatch(/^[A-Z2-9]{6}$/);
    const days = (new Date(res.body.expiresAt).getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThan(7.1);
  });

  it('joining gives the role and lists the shop', async () => {
    const { body } = await invite(owner, 'CM');
    const res = await request
      .post('/api/v1/invitations/join')
      .set(newcomer)
      .send({ code: body.code.toLowerCase() });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: shopId, role: 'CM' });
    const shops = await request.get('/api/v1/shops').set(newcomer);
    expect(shops.body).toEqual([expect.objectContaining({ id: shopId, role: 'CM' })]);
  });

  it('a code is single use (RG-52)', async () => {
    const { body } = await invite(owner, 'CM');
    await request.post('/api/v1/invitations/join').set(newcomer).send({ code: body.code });
    const again = await request
      .post('/api/v1/invitations/join')
      .set(auth('other'))
      .send({ code: body.code });
    expect(again.status).toBe(410);
    expect(again.body.code).toBe('INVITATION_EXPIRED');
  });

  it('refuses expired, revoked and unknown codes', async () => {
    const expired = await invite(owner, 'CM');
    await pool.query(`UPDATE shop_invitations SET expires_at = now() - interval '1 minute'`);
    const join = (code: string) =>
      request.post('/api/v1/invitations/join').set(newcomer).send({ code });
    expect((await join(expired.body.code)).status).toBe(410);

    const revoked = await invite(owner, 'CM');
    expect((await request.delete(api(`/invitations/${revoked.body.id}`)).set(owner)).status).toBe(
      204,
    );
    expect((await join(revoked.body.code)).status).toBe(410);

    expect((await join('ZZZZZZ')).status).toBe(404);
  });

  it('refuses a code for a shop the user is already in (RG-53)', async () => {
    const { body } = await invite(owner, 'DRIVER');
    const res = await request.post('/api/v1/invitations/join').set(cm).send({ code: body.code });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('ALREADY_MEMBER');
  });

  it('never invites an owner', async () => {
    expect((await invite(owner, 'OWNER')).status).toBe(400);
  });

  it('manager invites CM and drivers only (RG-58)', async () => {
    expect((await invite(manager, 'CM')).status).toBe(201);
    expect((await invite(manager, 'DRIVER')).status).toBe(201);
    expect((await invite(manager, 'MANAGER')).status).toBe(403);
  });

  it('CM and drivers cannot invite', async () => {
    expect((await invite(cm, 'CM')).status).toBe(403);
    expect((await invite(driver, 'DRIVER')).status).toBe(403);
  });

  it('lists pending codes; a manager sees only CM and driver codes', async () => {
    await invite(owner, 'MANAGER');
    await invite(owner, 'CM');
    const forOwner = await request.get(api('/invitations')).set(owner);
    expect(forOwner.body.map((i: { role: string }) => i.role).sort()).toEqual(['CM', 'MANAGER']);
    const forManager = await request.get(api('/invitations')).set(manager);
    expect(forManager.body.map((i: { role: string }) => i.role)).toEqual(['CM']);
  });
});

describe('members', () => {
  it('lists members, owner first, for owner and manager only', async () => {
    const res = await request.get(api('/members')).set(manager);
    expect(res.body.map((m: { role: string }) => m.role)).toEqual([
      'OWNER',
      'MANAGER',
      'CM',
      'DRIVER',
    ]);
    expect(res.body[0]).toMatchObject({ email: 'owner@example.com' });
    expect((await request.get(api('/members')).set(cm)).status).toBe(403);
  });

  it('owner can name another owner, then step down', async () => {
    const managerId = await userId('manager');
    const ownerId = await userId('owner');
    const up = await request
      .patch(api(`/members/${managerId}`))
      .set(owner)
      .send({ role: 'OWNER' });
    expect(up.body).toMatchObject({ role: 'OWNER' });
    const down = await request
      .patch(api(`/members/${ownerId}`))
      .set(owner)
      .send({ role: 'CM' });
    expect(down.status).toBe(200);
  });

  it('the last owner can be neither demoted, removed nor leave (RG-50)', async () => {
    const ownerId = await userId('owner');
    const demote = await request
      .patch(api(`/members/${ownerId}`))
      .set(owner)
      .send({ role: 'CM' });
    expect(demote.status).toBe(409);
    expect(demote.body.code).toBe('LAST_OWNER');
    expect((await request.delete(api(`/members/${ownerId}`)).set(owner)).status).toBe(409);
    expect((await request.post(api('/leave')).set(owner)).status).toBe(409);
  });

  it('manager switches CM and drivers, but touches neither managers nor owners (RG-58)', async () => {
    const cmId = await userId('cm');
    const ownerId = await userId('owner');
    const patch = (id: string, role: string) =>
      request
        .patch(api(`/members/${id}`))
        .set(manager)
        .send({ role });
    expect((await patch(cmId, 'DRIVER')).status).toBe(200);
    expect((await patch(cmId, 'MANAGER')).status).toBe(403);
    expect((await patch(ownerId, 'CM')).status).toBe(403);
    expect((await request.delete(api(`/members/${ownerId}`)).set(manager)).status).toBe(403);
  });

  it('a removed member loses access at once and their open deliveries are freed (RG-56)', async () => {
    const driverId = await userId('driver');
    const product = await createProduct(owner, shopId, { initialStock: 5 });
    const order = await request
      .post(api('/orders'))
      .set(owner)
      .send({ items: [{ productId: product.id, quantity: 1 }], delivery: { place: 'Analakely' } });
    await pool.query('UPDATE orders SET assigned_to = $1, assigned_at = now() WHERE id = $2', [
      driverId,
      order.body.id,
    ]);

    expect((await request.delete(api(`/members/${driverId}`)).set(manager)).status).toBe(204);
    expect((await request.get(api()).set(driver)).status).toBe(404);
    const { rows } = await pool.query('SELECT assigned_to, assigned_at FROM orders WHERE id = $1', [
      order.body.id,
    ]);
    expect(rows[0]).toEqual({ assigned_to: null, assigned_at: null });
  });

  it('data created by a member stays after they leave (RG-57)', async () => {
    await request.post(api('/customers')).set(cm).send({ name: 'Rasoa' });
    expect((await request.post(api('/leave')).set(cm)).status).toBe(204);
    expect((await request.get('/api/v1/shops').set(cm)).body).toEqual([]);
    const customers = await request.get(api('/customers')).set(owner);
    expect(customers.body).toHaveLength(1);
  });
});
