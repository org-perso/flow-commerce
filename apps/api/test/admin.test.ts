import { beforeEach, describe, expect, it } from 'vitest';

import { pool } from '../src/db/pool.js';
import { currentTotpStep, hashPassword, totpCode } from '../src/modules/admin/admin-crypto.js';
import { auth, createProduct, createShop, request, resetDatabase } from './helpers.js';

const PASSWORD = 'correct-horse-battery';
const A = '/api/v1/admin';

const owner = auth('owner');

/** The admin session cookie set by a response, as a request header. */
function cookieOf(res: { headers: Record<string, unknown> }): { Cookie: string } {
  const cookies = (res.headers['set-cookie'] as string[] | undefined) ?? [];
  const found = cookies.find((c) => c.startsWith('fc_admin='));
  if (!found) throw new Error('no admin cookie');
  return { Cookie: found.split(';')[0]! };
}

async function insertAdmin(
  username: string,
  options: { mfaRequired?: boolean; mustChangePassword?: boolean } = {},
): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO admin_users (username, name, password_hash, must_change_password, mfa_required)
     VALUES ($1, $1, $2, $3, $4) RETURNING id`,
    [
      username,
      await hashPassword(PASSWORD),
      options.mustChangePassword ?? false,
      options.mfaRequired ?? true,
    ],
  );
  return rows[0]!.id;
}

/** First sign-in with enrolment: returns the full session cookie, the secret and recovery codes. */
async function enrol(username: string) {
  const login = await request.post(`${A}/auth/login`).send({ username, password: PASSWORD });
  expect(login.status).toBe(200);
  expect(login.body.next).toBe('mfa-setup');
  const step = cookieOf(login);

  const setup = await request.post(`${A}/auth/mfa/setup`).set(step);
  expect(setup.status).toBe(200);
  const secret: string = setup.body.secret;

  const confirm = await request
    .post(`${A}/auth/mfa/setup/confirm`)
    .set(step)
    .send({ code: totpCode(secret, currentTotpStep()) });
  expect(confirm.status).toBe(200);
  return {
    cookie: cookieOf(confirm),
    secret,
    recoveryCodes: confirm.body.recoveryCodes as string[],
  };
}

async function signedInAdmin(username = 'boss') {
  await insertAdmin(username);
  return (await enrol(username)).cookie;
}

beforeEach(async () => {
  await resetDatabase();
  await pool.query(
    `TRUNCATE admin_users, admin_sessions, admin_recovery_codes, admin_login_attempts,
       admin_actions, admin_shop_notes, shop_notices CASCADE`,
  );
});

describe('admin sign-in', () => {
  it('password, then QR enrolment, then a full session', async () => {
    await insertAdmin('boss');
    const login = await request
      .post(`${A}/auth/login`)
      .send({ username: 'Boss', password: PASSWORD });
    expect(login.body).toEqual({ next: 'mfa-setup', mustChangePassword: false });
    const step = cookieOf(login);
    expect(login.headers['set-cookie']![0]).toMatch(/HttpOnly/);
    expect(login.headers['set-cookie']![0]).toMatch(/SameSite=Strict/);

    // The MFA-step session opens nothing else.
    expect((await request.get(`${A}/auth/me`).set(step)).status).toBe(401);
    expect((await request.get(`${A}/dashboard`).set(step)).status).toBe(401);

    const setup = await request.post(`${A}/auth/mfa/setup`).set(step);
    expect(setup.body.qrCode).toMatch(/^data:image\/png;base64,/);
    expect(setup.body.otpauthUrl).toContain('issuer=Flow.Co%20Admin');

    const wrong = await request
      .post(`${A}/auth/mfa/setup/confirm`)
      .set(step)
      .send({ code: '000000' });
    expect(wrong.status).toBe(400);

    const confirm = await request
      .post(`${A}/auth/mfa/setup/confirm`)
      .set(step)
      .send({ code: totpCode(setup.body.secret, currentTotpStep()) });
    expect(confirm.status).toBe(200);
    expect(confirm.body.recoveryCodes).toHaveLength(8);

    const me = await request.get(`${A}/auth/me`).set(cookieOf(confirm));
    expect(me.body).toMatchObject({ username: 'boss', mfaEnabled: true, mfaRequired: true });
    // The MFA-step session is gone.
    expect(
      (await request.post(`${A}/auth/mfa/verify`).set(step).send({ code: '123456' })).status,
    ).toBe(401);
  });

  it('next sign-ins ask for the code; a code or recovery code works only once', async () => {
    await insertAdmin('boss');
    const { secret, recoveryCodes } = await enrol('boss');

    const login = await request
      .post(`${A}/auth/login`)
      .send({ username: 'boss', password: PASSWORD });
    expect(login.body.next).toBe('mfa');
    const step = cookieOf(login);

    // The code used for enrolment cannot be replayed.
    const replay = await request
      .post(`${A}/auth/mfa/verify`)
      .set(step)
      .send({ code: totpCode(secret, currentTotpStep()) });
    expect(replay.status).toBe(400);

    const ok = await request
      .post(`${A}/auth/mfa/verify`)
      .set(step)
      .send({ recoveryCode: recoveryCodes[0]!.toLowerCase() });
    expect(ok.status).toBe(200);
    expect(ok.body.recoveryCodesLeft).toBe(7);
    expect((await request.get(`${A}/dashboard`).set(cookieOf(ok))).status).toBe(200);

    const again = await request
      .post(`${A}/auth/login`)
      .send({ username: 'boss', password: PASSWORD });
    const reused = await request
      .post(`${A}/auth/mfa/verify`)
      .set(cookieOf(again))
      .send({ recoveryCode: recoveryCodes[0] });
    expect(reused.status).toBe(400);

    // A fresh authenticator code works.
    await pool.query('UPDATE admin_users SET mfa_last_step = $1', [currentTotpStep() - 5]);
    const code = await request
      .post(`${A}/auth/mfa/verify`)
      .set(cookieOf(again))
      .send({ code: totpCode(secret, currentTotpStep()) });
    expect(code.status).toBe(200);
  });

  it('same answer for an unknown user and a wrong password; locked after 5 failures', async () => {
    await insertAdmin('boss');
    const unknown = await request
      .post(`${A}/auth/login`)
      .send({ username: 'nobody', password: PASSWORD });
    const wrong = await request
      .post(`${A}/auth/login`)
      .send({ username: 'boss', password: 'nope' });
    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(unknown.body.detail).toBe(wrong.body.detail);

    for (let i = 0; i < 4; i += 1) {
      await request.post(`${A}/auth/login`).send({ username: 'boss', password: 'nope' });
    }
    const locked = await request
      .post(`${A}/auth/login`)
      .send({ username: 'boss', password: PASSWORD });
    expect(locked.status).toBe(429);
  });

  it('a Firebase token never opens the admin space', async () => {
    const res = await request.get(`${A}/dashboard`).set(owner);
    expect(res.status).toBe(401);
  });

  it('MFA made optional by another admin: password only', async () => {
    await insertAdmin('relaxed', { mfaRequired: false });
    const login = await request
      .post(`${A}/auth/login`)
      .send({ username: 'relaxed', password: PASSWORD });
    expect(login.body.next).toBe('done');
    expect((await request.get(`${A}/dashboard`).set(cookieOf(login))).status).toBe(200);
  });

  it('logout closes the session', async () => {
    const cookie = await signedInAdmin();
    expect((await request.post(`${A}/auth/logout`).set(cookie)).status).toBe(204);
    expect((await request.get(`${A}/auth/me`).set(cookie)).status).toBe(401);
  });
});

describe('admin accounts', () => {
  it('a new admin must change the temporary password before anything else', async () => {
    const boss = await signedInAdmin();
    const created = await request
      .post(`${A}/admins`)
      .set(boss)
      .send({ username: 'helper', name: 'Helper', password: PASSWORD });
    expect(created.status).toBe(201);
    expect(created.body.mustChangePassword).toBe(true);

    const helper = (await enrol('helper')).cookie;
    const blocked = await request.get(`${A}/dashboard`).set(helper);
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe('PASSWORD_CHANGE_REQUIRED');

    const changed = await request
      .put(`${A}/auth/password`)
      .set(helper)
      .send({ currentPassword: PASSWORD, newPassword: 'another-long-password' });
    expect(changed.status).toBe(204);
    expect((await request.get(`${A}/dashboard`).set(helper)).status).toBe(200);
  });

  it('disable: not oneself, and the disabled admin is signed out', async () => {
    const boss = await signedInAdmin();
    const me = await request.get(`${A}/auth/me`).set(boss);
    expect((await request.post(`${A}/admins/${me.body.id}/disable`).set(boss)).status).toBe(409);

    const helperId = await insertAdmin('helper');
    const helper = (await enrol('helper')).cookie;
    const disabled = await request.post(`${A}/admins/${helperId}/disable`).set(boss);
    expect(disabled.status).toBe(200);
    expect(disabled.body.disabledAt).not.toBeNull();
    expect((await request.get(`${A}/auth/me`).set(helper)).status).toBe(401);

    const login = await request
      .post(`${A}/auth/login`)
      .send({ username: 'helper', password: PASSWORD });
    expect(login.status).toBe(401);

    const log = await request.get(`${A}/admins/${helperId}`).set(boss);
    expect(log.body.actions[0].action).toBe('ADMIN_DISABLED');
  });

  it('MFA reset: the admin enrols again', async () => {
    const boss = await signedInAdmin();
    const helperId = await insertAdmin('helper');
    await enrol('helper');
    const reset = await request.post(`${A}/admins/${helperId}/mfa/reset`).set(boss);
    expect(reset.body.mfaEnabled).toBe(false);
    const login = await request
      .post(`${A}/auth/login`)
      .send({ username: 'helper', password: PASSWORD });
    expect(login.body.next).toBe('mfa-setup');
  });
});

describe('admin actions on shops and users', () => {
  let shopId: string;
  let boss: { Cookie: string };

  beforeEach(async () => {
    shopId = await createShop(owner, 'Glow UP');
    await createProduct(owner, shopId);
    boss = await signedInAdmin();
  });

  it('lists shops with usage figures, never their data', async () => {
    const list = await request.get(`${A}/shops?search=glow`).set(boss);
    expect(list.status).toBe(200);
    expect(list.body.total).toBe(1);
    expect(list.body.items[0]).toMatchObject({
      name: 'Glow UP',
      status: 'ACTIVE',
      plan: 'FREE',
      membersCount: 1,
      ordersCount: 0,
      owner: { email: 'owner@example.com' },
    });

    const detail = await request.get(`${A}/shops/${shopId}`).set(boss);
    expect(detail.body.counts).toEqual({ products: 1, customers: 0, expenses: 0 });
    expect(detail.body.members[0]).toMatchObject({ role: 'OWNER', email: 'owner@example.com' });
    expect(JSON.stringify(detail.body)).not.toContain('purchasePrice');
  });

  it('suspend: the shop is read-only for its members until reactivated', async () => {
    const suspend = await request
      .post(`${A}/shops/${shopId}/suspend`)
      .set(boss)
      .send({ reason: 'FRAUD', details: 'Signalé par des clients' });
    expect(suspend.body.status).toBe('SUSPENDED');

    expect((await request.get(`/api/v1/shops/${shopId}/products`).set(owner)).status).toBe(200);
    const write = await request
      .post(`/api/v1/shops/${shopId}/products`)
      .set(owner)
      .send({ name: 'Savon', purchasePrice: 1, sellingPrice: 2 });
    expect(write.status).toBe(403);
    expect(write.body.code).toBe('SHOP_SUSPENDED');

    const shops = await request.get('/api/v1/shops').set(owner);
    expect(shops.body[0].status).toBe('SUSPENDED');

    await request.post(`${A}/shops/${shopId}/reactivate`).set(boss).send({});
    const after = await request
      .post(`/api/v1/shops/${shopId}/products`)
      .set(owner)
      .send({ name: 'Savon', purchasePrice: 1, sellingPrice: 2 });
    expect(after.status).toBe(201);

    const actions = await request.get(`${A}/shops/${shopId}/actions`).set(boss);
    expect(actions.body.map((a: { action: string }) => a.action)).toEqual([
      'SHOP_REACTIVATED',
      'SHOP_SUSPENDED',
    ]);
    expect(actions.body[1]).toMatchObject({ reason: 'FRAUD', admin: { username: 'boss' } });
  });

  it('flag stays internal; warn reaches the owners until read', async () => {
    await request.post(`${A}/shops/${shopId}/flag`).set(boss).send({ reason: 'CONTENT' });
    expect((await request.get(`${A}/shops?status=flagged`).set(boss)).body.total).toBe(1);
    expect((await request.get('/api/v1/me/notices').set(owner)).body).toEqual([]);

    const warn = await request
      .post(`${A}/shops/${shopId}/warn`)
      .set(boss)
      .send({ reason: 'CONTENT', message: 'Retirez les produits interdits.' });
    expect(warn.status).toBe(201);

    const notices = await request.get('/api/v1/me/notices').set(owner);
    expect(notices.body).toHaveLength(1);
    expect(notices.body[0]).toMatchObject({
      shopName: 'Glow UP',
      message: 'Retirez les produits interdits.',
    });

    // Another user cannot mark it read.
    const stranger = await request
      .post(`/api/v1/me/notices/${notices.body[0].id}/read`)
      .set(auth('x'));
    expect(stranger.status).toBe(404);
    await request.post(`/api/v1/me/notices/${notices.body[0].id}/read`).set(owner);
    expect((await request.get('/api/v1/me/notices').set(owner)).body).toEqual([]);

    const note = await request
      .post(`${A}/shops/${shopId}/notes`)
      .set(boss)
      .send({ body: 'À surveiller' });
    expect(note.status).toBe(201);
    expect((await request.get(`${A}/shops/${shopId}`).set(boss)).body.notes[0].body).toBe(
      'À surveiller',
    );
  });

  it('a suspended account is refused by the seller API', async () => {
    const users = await request.get(`${A}/users?search=owner`).set(boss);
    const userId = users.body.items[0].id;
    await request.post(`${A}/users/${userId}/suspend`).set(boss).send({ reason: 'FRAUD' });

    const me = await request.get('/api/v1/me').set(owner);
    expect(me.status).toBe(403);
    expect(me.body.code).toBe('ACCOUNT_SUSPENDED');

    const detail = await request.get(`${A}/users/${userId}`).set(boss);
    expect(detail.body.shops[0]).toMatchObject({ name: 'Glow UP', role: 'OWNER' });

    await request.post(`${A}/users/${userId}/reactivate`).set(boss).send({});
    expect((await request.get('/api/v1/me').set(owner)).status).toBe(200);
  });

  it('dashboard counts and daily activity', async () => {
    const dashboard = await request.get(`${A}/dashboard`).set(boss);
    expect(dashboard.body.users.total).toBe(1);
    expect(dashboard.body.shops).toMatchObject({ total: 1, suspended: 0, flagged: 0 });
    expect(dashboard.body.plans.byPlan).toEqual({ FREE: 1 });

    const activity = await request.get(`${A}/dashboard/activity?days=7`).set(boss);
    expect(activity.body).toHaveLength(7);
    expect(activity.body[6]).toMatchObject({ signups: 1, shops: 1 });
  });
});
