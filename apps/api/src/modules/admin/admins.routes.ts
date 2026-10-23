import { Router } from 'express';
import { z } from 'zod';

import { pool, withTransaction } from '../../db/pool.js';
import { idParam, notFound } from '../../http/params.js';
import { ProblemError } from '../../http/problem.js';
import { requiredText } from '../../http/schemas.js';
import { listActions, logAction } from './admin-audit.js';
import { hashPassword } from './admin-crypto.js';
import { currentAdmin } from './admin-session.js';
import { newPassword, username } from './admin.schemas.js';

// F-25: admin accounts. Every change is logged and closes the target's sessions (RG-83).

const columns = `id, username, name,
  must_change_password AS "mustChangePassword",
  mfa_enabled_at IS NOT NULL AS "mfaEnabled", mfa_required AS "mfaRequired",
  disabled_at AS "disabledAt", last_login_at AS "lastLoginAt", created_at AS "createdAt"`;

type AdminRow = { id: string; username: string; name: string; disabledAt: Date | null };

const createSchema = z
  .object({ username, name: requiredText(150), password: newPassword })
  .strict();

async function findAdmin(id: string): Promise<AdminRow> {
  const { rows } = await pool.query<AdminRow>(`SELECT ${columns} FROM admin_users WHERE id = $1`, [
    id,
  ]);
  if (!rows[0]) throw notFound('Admin');
  return rows[0];
}

/** Admins cannot act on their own account here (they would lock themselves out). */
function notSelf(adminId: string, targetId: string) {
  if (adminId === targetId) {
    throw new ProblemError(409, 'Conflict', 'Impossible sur votre propre compte.');
  }
}

export const adminsRouter = Router();

adminsRouter.get('/', async (_req, res) => {
  const { rows } = await pool.query(`SELECT ${columns} FROM admin_users ORDER BY created_at`);
  res.json(rows);
});

/** New admin with a temporary password, to change at first sign-in; MFA enrolment follows. */
adminsRouter.post('/', async (req, res) => {
  const body = createSchema.parse(req.body);
  const hash = await hashPassword(body.password);
  const created = await withTransaction(async (client) => {
    const { rows } = await client.query<AdminRow>(
      `INSERT INTO admin_users (username, name, password_hash) VALUES ($1, $2, $3)
       RETURNING ${columns}`,
      [body.username, body.name, hash],
    );
    const admin = rows[0]!;
    await logAction(client, currentAdmin(req).id, {
      action: 'ADMIN_CREATED',
      targetType: 'admin',
      targetId: admin.id,
      targetLabel: admin.username,
    });
    return admin;
  });
  res.status(201).json(created);
});

adminsRouter.get('/:adminId', async (req, res) => {
  const admin = await findAdmin(idParam(req.params.adminId, 'Admin'));
  res.json({ ...admin, actions: await listActions(pool, 'admin', admin.id) });
});

/** RG-75: never the last active admin. */
adminsRouter.post('/:adminId/disable', async (req, res) => {
  const me = currentAdmin(req);
  const target = await findAdmin(idParam(req.params.adminId, 'Admin'));
  notSelf(me.id, target.id);
  await withTransaction(async (client) => {
    const { rows } = await client.query<{ n: number }>(
      // Locks the active admins: two admins disabling each other cannot leave none.
      `SELECT count(*)::int AS n FROM (
         SELECT id FROM admin_users WHERE disabled_at IS NULL AND id <> $1 FOR UPDATE
       ) others`,
      [target.id],
    );
    if (rows[0]!.n === 0) {
      throw new ProblemError(409, 'Conflict', 'Il doit rester au moins un admin actif.');
    }
    await client.query(
      'UPDATE admin_users SET disabled_at = COALESCE(disabled_at, now()) WHERE id = $1',
      [target.id],
    );
    await client.query('DELETE FROM admin_sessions WHERE admin_id = $1', [target.id]);
    await logAction(client, me.id, {
      action: 'ADMIN_DISABLED',
      targetType: 'admin',
      targetId: target.id,
      targetLabel: target.username,
    });
  });
  res.json(await findAdmin(target.id));
});

adminsRouter.post('/:adminId/enable', async (req, res) => {
  const target = await findAdmin(idParam(req.params.adminId, 'Admin'));
  await withTransaction(async (client) => {
    await client.query('UPDATE admin_users SET disabled_at = NULL WHERE id = $1', [target.id]);
    await logAction(client, currentAdmin(req).id, {
      action: 'ADMIN_ENABLED',
      targetType: 'admin',
      targetId: target.id,
      targetLabel: target.username,
    });
  });
  res.json(await findAdmin(target.id));
});

/** Forgotten password: another admin sets a temporary one (no public reset link). */
adminsRouter.post('/:adminId/reset-password', async (req, res) => {
  const me = currentAdmin(req);
  const target = await findAdmin(idParam(req.params.adminId, 'Admin'));
  notSelf(me.id, target.id);
  const { password } = z.object({ password: newPassword }).strict().parse(req.body);
  const hash = await hashPassword(password);
  await withTransaction(async (client) => {
    await client.query(
      'UPDATE admin_users SET password_hash = $2, must_change_password = true WHERE id = $1',
      [target.id, hash],
    );
    await client.query('DELETE FROM admin_sessions WHERE admin_id = $1', [target.id]);
    await logAction(client, me.id, {
      action: 'ADMIN_PASSWORD_RESET',
      targetType: 'admin',
      targetId: target.id,
      targetLabel: target.username,
    });
  });
  res.status(204).end();
});

/** Lost phone: the admin enrols again at next sign-in (old secret and recovery codes dropped). */
adminsRouter.post('/:adminId/mfa/reset', async (req, res) => {
  const me = currentAdmin(req);
  const target = await findAdmin(idParam(req.params.adminId, 'Admin'));
  notSelf(me.id, target.id);
  await withTransaction(async (client) => {
    await client.query(
      `UPDATE admin_users SET mfa_secret = NULL, mfa_enabled_at = NULL, mfa_last_step = NULL
       WHERE id = $1`,
      [target.id],
    );
    await client.query('DELETE FROM admin_recovery_codes WHERE admin_id = $1', [target.id]);
    await client.query('DELETE FROM admin_sessions WHERE admin_id = $1', [target.id]);
    await logAction(client, me.id, {
      action: 'ADMIN_MFA_RESET',
      targetType: 'admin',
      targetId: target.id,
      targetLabel: target.username,
    });
  });
  res.json(await findAdmin(target.id));
});

/**
 * MFA mandatory (default) or optional for one admin. Only another admin can change it: a stolen
 * password alone can never turn MFA off.
 */
adminsRouter.put('/:adminId/mfa-required', async (req, res) => {
  const me = currentAdmin(req);
  const target = await findAdmin(idParam(req.params.adminId, 'Admin'));
  notSelf(me.id, target.id);
  const { required } = z.object({ required: z.boolean() }).strict().parse(req.body);
  await withTransaction(async (client) => {
    await client.query('UPDATE admin_users SET mfa_required = $2 WHERE id = $1', [
      target.id,
      required,
    ]);
    await logAction(client, me.id, {
      action: required ? 'ADMIN_MFA_REQUIRED' : 'ADMIN_MFA_OPTIONAL',
      targetType: 'admin',
      targetId: target.id,
      targetLabel: target.username,
    });
  });
  res.json(await findAdmin(target.id));
});
