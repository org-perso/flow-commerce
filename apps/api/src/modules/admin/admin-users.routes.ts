import { Router } from 'express';
import { z } from 'zod';

import { pool, withTransaction } from '../../db/pool.js';
import { idParam, notFound } from '../../http/params.js';
import { ProblemError } from '../../http/problem.js';
import { pagination } from '../../http/schemas.js';
import { listActions, logAction } from './admin-audit.js';
import { currentAdmin } from './admin-session.js';
import { actionSchema, reactivateSchema } from './admin.schemas.js';

// F-23: seller accounts.

const listSchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(['active', 'suspended']).optional(),
  ...pagination,
});

const columns = `u.id, u.email, u.name, u.created_at AS "createdAt",
  u.suspended_at AS "suspendedAt",
  (SELECT count(*)::int FROM shop_members m WHERE m.user_id = u.id) AS "shopsCount"`;

type UserRow = { id: string; email: string | null; name: string | null; suspendedAt: Date | null };

async function findUser(userId: string): Promise<UserRow> {
  const { rows } = await pool.query<UserRow>(`SELECT ${columns} FROM users u WHERE u.id = $1`, [
    userId,
  ]);
  if (!rows[0]) throw notFound('User');
  return rows[0];
}

const label = (user: UserRow) => user.email ?? user.name ?? user.id;

export const adminUsersRouter = Router();

adminUsersRouter.get('/', async (req, res) => {
  const q = listSchema.parse(req.query);
  const { rows } = await pool.query(
    `SELECT ${columns}, count(*) OVER()::int AS "totalCount"
     FROM users u
     WHERE ($1::text IS NULL OR u.email ILIKE '%' || $1 || '%' OR u.name ILIKE '%' || $1 || '%')
       AND ($2::text IS NULL
            OR ($2 = 'active' AND u.suspended_at IS NULL)
            OR ($2 = 'suspended' AND u.suspended_at IS NOT NULL))
     ORDER BY u.created_at DESC
     LIMIT $3 OFFSET $4`,
    [q.search || null, q.status ?? null, q.limit, q.offset],
  );
  const total = rows[0]?.totalCount ?? 0;
  res.json({ items: rows.map(({ totalCount: _t, ...user }) => user), total });
});

adminUsersRouter.get('/:userId', async (req, res) => {
  const user = await findUser(idParam(req.params.userId, 'User'));
  const { rows } = await pool.query(
    `SELECT u.suspended_reason AS "suspendedReason",
       (SELECT COALESCE(json_agg(json_build_object(
                 'id', s.id, 'name', s.name, 'role', m.role, 'status', s.status,
                 'joinedAt', m.created_at) ORDER BY m.created_at), '[]')
        FROM shop_members m JOIN shops s ON s.id = m.shop_id
        WHERE m.user_id = u.id) AS shops
     FROM users u WHERE u.id = $1`,
    [user.id],
  );
  res.json({ ...user, ...rows[0], actions: await listActions(pool, 'user', user.id) });
});

/** RG-74: the account is refused by the API; its shops keep working for the other members. */
adminUsersRouter.post('/:userId/suspend', async (req, res) => {
  const user = await findUser(idParam(req.params.userId, 'User'));
  const body = actionSchema.parse(req.body);
  if (user.suspendedAt) throw new ProblemError(409, 'Conflict', 'Compte déjà suspendu.');
  await withTransaction(async (client) => {
    await client.query(
      'UPDATE users SET suspended_at = now(), suspended_reason = $2 WHERE id = $1',
      [user.id, body.details ?? null],
    );
    await logAction(client, currentAdmin(req).id, {
      action: 'USER_SUSPENDED',
      targetType: 'user',
      targetId: user.id,
      targetLabel: label(user),
      reason: body.reason,
      details: body.details ?? null,
    });
  });
  res.json(await findUser(user.id));
});

adminUsersRouter.post('/:userId/reactivate', async (req, res) => {
  const user = await findUser(idParam(req.params.userId, 'User'));
  const body = reactivateSchema.parse(req.body ?? {});
  if (!user.suspendedAt) throw new ProblemError(409, 'Conflict', 'Compte non suspendu.');
  await withTransaction(async (client) => {
    await client.query(
      'UPDATE users SET suspended_at = NULL, suspended_reason = NULL WHERE id = $1',
      [user.id],
    );
    await logAction(client, currentAdmin(req).id, {
      action: 'USER_REACTIVATED',
      targetType: 'user',
      targetId: user.id,
      targetLabel: label(user),
      details: body.details ?? null,
    });
  });
  res.json(await findUser(user.id));
});
