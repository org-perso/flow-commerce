import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { env } from '../src/config/env.js';
import { pool } from '../src/db/pool.js';
import { hashPassword } from '../src/modules/admin/admin-crypto.js';
import { auth, createProduct, createShop, request, resetDatabase } from './helpers.js';

const owner = auth('owner');
let shopId: string;
let productId: string;
let admin: { Cookie: string };
const api = (path = '') => `/api/v1/shops/${shopId}${path}`;
const A = '/api/v1/admin';

const subscription = async () => (await request.get(api('/subscription')).set(owner)).body;
const newOrder = () =>
  request
    .post(api('/orders'))
    .set(owner)
    .send({ items: [{ productId, quantity: 1 }] });
const declare = (body: Record<string, unknown> = {}) =>
  request
    .post(api('/subscription/payments'))
    .set(owner)
    .send({ plan: 'PRO', months: 1, operator: 'MVOLA', reference: 'MP251024.1234.A1', ...body });

/** Orders created this month, straight in the database (the quota counts them). */
async function fillOrders(count: number) {
  await pool.query(
    `INSERT INTO orders (shop_id, number) SELECT $1, 1000 + g FROM generate_series(1, $2) g`,
    [shopId, count],
  );
}

beforeEach(async () => {
  await resetDatabase();
  await pool.query('TRUNCATE admin_users, admin_actions, subscription_payments CASCADE');
  shopId = await createShop(owner);
  productId = (await createProduct(owner, shopId, { initialStock: 500 })).id;
  await pool.query(
    `INSERT INTO admin_users (username, name, password_hash, must_change_password, mfa_required)
     VALUES ('boss', 'Boss', $1, false, false)`,
    [await hashPassword('correct-horse-battery')],
  );
  const login = await request
    .post(`${A}/auth/login`)
    .send({ username: 'boss', password: 'correct-horse-battery' });
  admin = { Cookie: (login.headers['set-cookie'] as unknown as string[])[0]!.split(';')[0]! };
});

afterEach(() => {
  env.SUBSCRIPTIONS_ENFORCED = false;
});

describe('GET /shops/:shopId/subscription', () => {
  it('owner only: plan, usage, prices (12 months for 10) and payment reference', async () => {
    const s = await subscription();
    expect(s).toMatchObject({
      plan: 'FREE',
      enforced: false,
      usage: { ordersThisMonth: 0, members: 0, drivers: 0 },
      limits: { ordersPerMonth: 50 },
      prices: { PRO: { 1: 20000, 3: 60000, 12: 200000 }, BUSINESS: { 12: 300000 } },
    });
    expect(s.paymentReference).toMatch(/^FC-[A-Z2-9]{6}$/);

    await request.get('/api/v1/me').set(auth('cm'));
    await pool.query(
      `INSERT INTO shop_members (shop_id, user_id, role)
       SELECT $1, id, 'CM' FROM users WHERE firebase_uid = 'cm'`,
      [shopId],
    );
    expect((await request.get(api('/subscription')).set(auth('cm'))).status).toBe(403);
  });
});

describe('limits', () => {
  it('switched off by default: nothing is blocked', async () => {
    await fillOrders(60);
    expect((await newOrder()).status).toBe(201);
  });

  it('Free: 50 orders a month, then a clear refusal', async () => {
    env.SUBSCRIPTIONS_ENFORCED = true;
    await fillOrders(49);
    expect((await newOrder()).status).toBe(201);
    const refused = await newOrder();
    expect(refused.status).toBe(403);
    expect(refused.body).toMatchObject({ code: 'PLAN_LIMIT_REACHED', limit: 'orders', max: 50 });
    // Existing orders keep working: reading is never limited.
    expect((await request.get(api('/orders')).set(owner)).status).toBe(200);
  });

  it('Free: no team, no driver, one shop', async () => {
    env.SUBSCRIPTIONS_ENFORCED = true;
    const driver = await request.post(api('/invitations')).set(owner).send({ role: 'DRIVER' });
    expect(driver.body).toMatchObject({ code: 'PLAN_LIMIT_REACHED', limit: 'drivers' });
    const cm = await request.post(api('/invitations')).set(owner).send({ role: 'CM' });
    expect(cm.body).toMatchObject({ limit: 'members' });
    const shop = await request.post('/api/v1/shops').set(owner).send({ name: 'Deuxième' });
    expect(shop.body).toMatchObject({ code: 'PLAN_LIMIT_REACHED', limit: 'shops', max: 1 });
  });
});

describe('payments', () => {
  it('declared: the plan applies at once (provisional), one pending at a time', async () => {
    env.SUBSCRIPTIONS_ENFORCED = true;
    await fillOrders(50);
    const res = await declare();
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ amount: 20000, status: 'PENDING' });
    expect((await subscription()).plan).toBe('PRO');
    expect((await newOrder()).status).toBe(201);
    expect((await declare({ reference: 'OTHER123' })).body.code).toBe('PAYMENT_PENDING');
  });

  it('validated by an admin: the plan runs for the paid months', async () => {
    const payment = (await declare({ months: 3 })).body;
    const pending = await request.get(`${A}/payments?status=PENDING`).set(admin);
    expect(pending.body[0]).toMatchObject({ id: payment.id, shop: { id: shopId } });

    expect((await request.post(`${A}/payments/${payment.id}/validate`).set(admin)).status).toBe(
      204,
    );
    const s = await subscription();
    expect(s.paidPlan).toBe('PRO');
    const days = (Date.parse(s.endsAt) - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(85);
    expect(days).toBeLessThan(95);
    // Never twice.
    expect((await request.post(`${A}/payments/${payment.id}/validate`).set(admin)).status).toBe(
      409,
    );
    // RG-93: the same transaction reference cannot be declared again.
    expect((await declare()).body.code).toBe('PAYMENT_REFERENCE_USED');

    const dashboard = await request.get(`${A}/dashboard`).set(admin);
    expect(dashboard.body.plans).toMatchObject({ revenueThisMonth: 60000, pendingPayments: 0 });
  });

  it('refused: back to the previous plan; the reference can be retyped', async () => {
    const payment = (await declare()).body;
    await request
      .post(`${A}/payments/${payment.id}/reject`)
      .set(admin)
      .send({ reason: 'Paiement non reçu' });
    const s = await subscription();
    expect(s.plan).toBe('FREE');
    expect(s.payments[0]).toMatchObject({ status: 'REJECTED', rejectReason: 'Paiement non reçu' });
    expect((await declare()).status).toBe(201);
  });
});

describe('plan end', () => {
  it('3 days of grace after the end, then Free', async () => {
    await pool.query(
      `UPDATE shops SET plan = 'PRO', plan_ends_at = now() - interval '2 days' WHERE id = $1`,
      [shopId],
    );
    expect(await subscription()).toMatchObject({ plan: 'PRO', inGrace: true });
    await pool.query(`UPDATE shops SET plan_ends_at = now() - interval '4 days' WHERE id = $1`, [
      shopId,
    ]);
    expect((await subscription()).plan).toBe('FREE');
  });

  it('admin offers 3 months of Business: drivers allowed', async () => {
    env.SUBSCRIPTIONS_ENFORCED = true;
    const res = await request
      .post(`${A}/shops/${shopId}/plan`)
      .set(admin)
      .send({ plan: 'BUSINESS', months: 3, details: 'Vendeur pilote' });
    expect(res.body.plan).toBe('BUSINESS');
    const driver = await request.post(api('/invitations')).set(owner).send({ role: 'DRIVER' });
    expect(driver.status).toBe(201);
    const log = await request.get(`${A}/shops/${shopId}/actions`).set(admin);
    expect(log.body[0]).toMatchObject({ action: 'SHOP_PLAN_CHANGED' });
  });
});
