import { Router, type Request } from 'express';
import QRCode from 'qrcode';
import { z } from 'zod';

import { pool, withTransaction, type Db } from '../../db/pool.js';
import { idParam, notFound } from '../../http/params.js';
import { ProblemError } from '../../http/problem.js';
import {
  assertAdminConfigured,
  decryptSecret,
  DUMMY_HASH_PROMISE,
  encryptSecret,
  generateRecoveryCodes,
  generateTotpSecret,
  hashPassword,
  normalizeRecoveryCode,
  otpauthUrl,
  sha256,
  verifyPassword,
  verifyTotp,
} from './admin-crypto.js';
import {
  ADMIN_COOKIE,
  clearSessionCookie,
  currentAdmin,
  currentAdminSession,
  requireAdmin,
  requireMfaStep,
  startSession,
} from './admin-session.js';
import { newPassword, username } from './admin.schemas.js';

/** RG-82: 5 failures on a username or an IP address block sign-in for 15 minutes. */
const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;

const invalidCredentials = () => new ProblemError(401, 'Unauthorized', 'Identifiants incorrects.');

async function assertNotLocked(user: string, ip: string | null) {
  const { rows } = await pool.query<{ byUser: number; byIp: number }>(
    `SELECT count(*) FILTER (WHERE username = $1)::int AS "byUser",
            count(*) FILTER (WHERE ip = $2)::int AS "byIp"
     FROM admin_login_attempts
     WHERE NOT success AND created_at > now() - make_interval(mins => $3)
       AND (username = $1 OR ip = $2)`,
    [user, ip, LOCK_MINUTES],
  );
  const { byUser, byIp } = rows[0]!;
  if (byUser >= MAX_FAILURES || byIp >= MAX_FAILURES) {
    throw new ProblemError(
      429,
      'Too Many Requests',
      `Trop de tentatives. Réessayez dans ${LOCK_MINUTES} minutes.`,
    );
  }
}

/** RG-84: every attempt is recorded (lockout and audit). */
async function recordAttempt(
  db: Db,
  req: Request,
  user: string,
  kind: 'password' | 'mfa',
  success: boolean,
) {
  await db.query(
    'INSERT INTO admin_login_attempts (username, ip, kind, success) VALUES ($1, $2, $3, $4)',
    [user, req.ip ?? null, kind, success],
  );
}

/** Replaces the current (MFA-step) session by a full one: the admin is signed in. */
async function completeSignIn(
  db: Db,
  req: Request,
  res: Parameters<typeof startSession>[2],
  adminId: string,
) {
  await db.query('DELETE FROM admin_sessions WHERE id = $1', [currentAdminSession(req).id]);
  await db.query('UPDATE admin_users SET last_login_at = now() WHERE id = $1', [adminId]);
  await startSession(db, req, res, adminId, 'full');
}

const recoveryHash = (adminId: string, code: string) =>
  sha256(`${adminId}:${normalizeRecoveryCode(code)}`);

async function replaceRecoveryCodes(db: Db, adminId: string): Promise<string[]> {
  const codes = generateRecoveryCodes();
  await db.query('DELETE FROM admin_recovery_codes WHERE admin_id = $1', [adminId]);
  await db.query(
    `INSERT INTO admin_recovery_codes (admin_id, code_hash)
     SELECT $1, unnest($2::text[])`,
    [adminId, codes.map((c) => recoveryHash(adminId, c))],
  );
  return codes;
}

const loginSchema = z.object({ username, password: z.string().min(1).max(200) }).strict();

const codeSchema = z.string().regex(/^\d{6}$/, 'Code à 6 chiffres attendu.');

const verifySchema = z
  .object({
    code: codeSchema.optional(),
    recoveryCode: z.string().trim().min(8).max(20).optional(),
  })
  .strict()
  .refine((b) => Boolean(b.code) !== Boolean(b.recoveryCode), {
    message: 'Donnez soit un code, soit un code de secours.',
  });

const passwordSchema = z
  .object({ currentPassword: z.string().min(1).max(200), newPassword })
  .strict();

export const adminAuthRouter = Router();

/**
 * Step 1: username + password. Answers what comes next:
 * "mfa" (enter the code), "mfa-setup" (scan the QR code first) or "done" (MFA made optional).
 */
adminAuthRouter.post('/login', async (req, res) => {
  assertAdminConfigured();
  const body = loginSchema.parse(req.body);
  await assertNotLocked(body.username, req.ip ?? null);

  const { rows } = await pool.query<{
    id: string;
    passwordHash: string;
    disabled: boolean;
    mfaEnabled: boolean;
    mfaRequired: boolean;
    mustChangePassword: boolean;
  }>(
    `SELECT id, password_hash AS "passwordHash", disabled_at IS NOT NULL AS disabled,
            mfa_enabled_at IS NOT NULL AS "mfaEnabled", mfa_required AS "mfaRequired",
            must_change_password AS "mustChangePassword"
     FROM admin_users WHERE username = $1`,
    [body.username],
  );
  const admin = rows[0];
  // Unknown usernames take as long as wrong passwords: no way to probe accounts.
  const valid = await verifyPassword(
    body.password,
    admin?.passwordHash ?? (await DUMMY_HASH_PROMISE),
  );
  if (!admin || !valid || admin.disabled) {
    await recordAttempt(pool, req, body.username, 'password', false);
    throw invalidCredentials();
  }

  await pool.query('DELETE FROM admin_sessions WHERE expires_at < now()');
  const next = admin.mfaEnabled ? 'mfa' : admin.mfaRequired ? 'mfa-setup' : 'done';
  await withTransaction(async (client) => {
    await recordAttempt(client, req, body.username, 'password', true);
    if (next === 'done') {
      await client.query('UPDATE admin_users SET last_login_at = now() WHERE id = $1', [admin.id]);
    }
    await startSession(client, req, res, admin.id, next === 'done' ? 'full' : 'mfa');
  });
  res.json({ next, mustChangePassword: admin.mustChangePassword });
});

/** Enrolment: a new secret, as a QR code for the authenticator app (and as text). */
adminAuthRouter.post('/mfa/setup', requireMfaStep, async (req, res) => {
  const admin = currentAdmin(req);
  if (admin.mfaEnabled) throw new ProblemError(409, 'Conflict', 'La MFA est déjà activée.');

  const secret = generateTotpSecret();
  await pool.query('UPDATE admin_users SET mfa_secret = $2 WHERE id = $1', [
    admin.id,
    encryptSecret(secret),
  ]);
  const url = otpauthUrl(secret, admin.username);
  res.json({
    secret,
    otpauthUrl: url,
    qrCode: await QRCode.toDataURL(url, { margin: 1, width: 240 }),
  });
});

/** Enrolment, confirmed by a first code: MFA on, recovery codes shown once, signed in. */
adminAuthRouter.post('/mfa/setup/confirm', requireMfaStep, async (req, res) => {
  const admin = currentAdmin(req);
  const { code } = z.object({ code: codeSchema }).strict().parse(req.body);
  if (admin.mfaEnabled) throw new ProblemError(409, 'Conflict', 'La MFA est déjà activée.');
  await assertNotLocked(admin.username, req.ip ?? null);

  const { rows } = await pool.query<{ secret: string | null }>(
    'SELECT mfa_secret AS secret FROM admin_users WHERE id = $1',
    [admin.id],
  );
  const stored = rows[0]?.secret;
  if (!stored)
    throw new ProblemError(409, 'Conflict', 'Lancez d’abord la configuration de la MFA.');

  const step = verifyTotp(decryptSecret(stored), code, null);
  if (step === null) {
    await recordAttempt(pool, req, admin.username, 'mfa', false);
    throw new ProblemError(400, 'Bad Request', 'Code incorrect.');
  }

  const recoveryCodes = await withTransaction(async (client) => {
    await recordAttempt(client, req, admin.username, 'mfa', true);
    await client.query(
      'UPDATE admin_users SET mfa_enabled_at = now(), mfa_last_step = $2 WHERE id = $1',
      [admin.id, step],
    );
    const codes = await replaceRecoveryCodes(client, admin.id);
    await completeSignIn(client, req, res, admin.id);
    return codes;
  });
  res.json({ recoveryCodes, mustChangePassword: admin.mustChangePassword });
});

/** Step 2 of each sign-in: the authenticator code, or a recovery code (lost phone). */
adminAuthRouter.post('/mfa/verify', requireMfaStep, async (req, res) => {
  const admin = currentAdmin(req);
  const body = verifySchema.parse(req.body);
  if (!admin.mfaEnabled) throw new ProblemError(409, 'Conflict', 'La MFA n’est pas configurée.');
  await assertNotLocked(admin.username, req.ip ?? null);

  const ok = await withTransaction(async (client) => {
    if (body.code) {
      const { rows } = await client.query<{ secret: string; lastStep: number | null }>(
        `SELECT mfa_secret AS secret, mfa_last_step AS "lastStep"
         FROM admin_users WHERE id = $1 FOR UPDATE`,
        [admin.id],
      );
      const step = verifyTotp(decryptSecret(rows[0]!.secret), body.code, rows[0]!.lastStep);
      if (step === null) return false;
      await client.query('UPDATE admin_users SET mfa_last_step = $2 WHERE id = $1', [
        admin.id,
        step,
      ]);
    } else {
      const { rowCount } = await client.query(
        `UPDATE admin_recovery_codes SET used_at = now()
         WHERE admin_id = $1 AND code_hash = $2 AND used_at IS NULL`,
        [admin.id, recoveryHash(admin.id, body.recoveryCode!)],
      );
      if (!rowCount) return false;
    }
    await recordAttempt(client, req, admin.username, 'mfa', true);
    await completeSignIn(client, req, res, admin.id);
    return true;
  });
  if (!ok) {
    await recordAttempt(pool, req, admin.username, 'mfa', false);
    throw new ProblemError(400, 'Bad Request', 'Code incorrect.');
  }

  const { rows } = await pool.query<{ left: number }>(
    'SELECT count(*)::int AS left FROM admin_recovery_codes WHERE admin_id = $1 AND used_at IS NULL',
    [admin.id],
  );
  res.json({ mustChangePassword: admin.mustChangePassword, recoveryCodesLeft: rows[0]!.left });
});

/** Closes this session, whatever its stage. */
adminAuthRouter.post('/logout', async (req, res) => {
  const token = (req.header('cookie') ?? '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_COOKIE}=`))
    ?.slice(ADMIN_COOKIE.length + 1);
  if (token) {
    await pool.query('DELETE FROM admin_sessions WHERE token_hash = $1', [
      sha256(decodeURIComponent(token)),
    ]);
  }
  clearSessionCookie(res);
  res.status(204).end();
});

adminAuthRouter.get('/me', requireAdmin({ allowPasswordChange: true }), (req, res) => {
  res.json(currentAdmin(req));
});

/** RG-83: changing the password closes the admin's other sessions. */
adminAuthRouter.put('/password', requireAdmin({ allowPasswordChange: true }), async (req, res) => {
  const admin = currentAdmin(req);
  const body = passwordSchema.parse(req.body);
  const { rows } = await pool.query<{ hash: string }>(
    'SELECT password_hash AS hash FROM admin_users WHERE id = $1',
    [admin.id],
  );
  if (!(await verifyPassword(body.currentPassword, rows[0]!.hash))) {
    throw new ProblemError(400, 'Bad Request', 'Mot de passe actuel incorrect.');
  }
  if (body.currentPassword === body.newPassword) {
    throw new ProblemError(400, 'Bad Request', 'Choisissez un mot de passe différent.');
  }
  const hash = await hashPassword(body.newPassword);
  await withTransaction(async (client) => {
    await client.query(
      'UPDATE admin_users SET password_hash = $2, must_change_password = false WHERE id = $1',
      [admin.id, hash],
    );
    await client.query('DELETE FROM admin_sessions WHERE admin_id = $1 AND id <> $2', [
      admin.id,
      currentAdminSession(req).id,
    ]);
  });
  res.status(204).end();
});

/** The admin's open sessions (devices). */
adminAuthRouter.get('/sessions', requireAdmin(), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, ip, user_agent AS "userAgent", created_at AS "createdAt",
            last_seen_at AS "lastSeenAt", id = $2 AS current
     FROM admin_sessions
     WHERE admin_id = $1 AND stage = 'full' AND expires_at > now()
     ORDER BY last_seen_at DESC`,
    [currentAdmin(req).id, currentAdminSession(req).id],
  );
  res.json(rows);
});

adminAuthRouter.delete('/sessions/:sessionId', requireAdmin(), async (req, res) => {
  const sessionId = idParam(req.params.sessionId, 'Session');
  const { rowCount } = await pool.query(
    'DELETE FROM admin_sessions WHERE id = $1 AND admin_id = $2',
    [sessionId, currentAdmin(req).id],
  );
  if (!rowCount) throw notFound('Session');
  res.status(204).end();
});
