import { Router } from 'express';
import { z } from 'zod';

import { pool } from '../../db/pool.js';
import { currentUser } from '../../http/context.js';
import { idParam, notFound } from '../../http/params.js';
import { deleteAccount } from './account.service.js';
import { updateUser } from './user.repository.js';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null)
    .nullable()
    .optional();

const updateMeSchema = z.object({
  name: optionalText(150),
  phone: optionalText(30),
});

export const meRouter = Router();

meRouter.get('/', (req, res) => {
  res.json(currentUser(req));
});

meRouter.patch('/', async (req, res) => {
  const patch = updateMeSchema.parse(req.body);
  res.json(await updateUser(currentUser(req).id, patch));
});

/**
 * Deletes the account and its data (Play Store requirement). The app then removes the returned
 * photos from Firebase Storage and deletes the Firebase account itself.
 */
meRouter.delete('/', async (req, res) => {
  res.json(await deleteAccount(currentUser(req).id));
});

/** Warnings from Flow.Co to the shops the user owns, not read yet (af-v3-admin RG-77). */
meRouter.get('/notices', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT n.id, n.shop_id AS "shopId", s.name AS "shopName", n.reason, n.message,
            n.created_at AS "createdAt"
     FROM shop_notices n
     JOIN shops s ON s.id = n.shop_id
     JOIN shop_members m ON m.shop_id = n.shop_id AND m.user_id = $1 AND m.role = 'OWNER'
     WHERE n.read_at IS NULL
     ORDER BY n.created_at DESC`,
    [currentUser(req).id],
  );
  res.json(rows);
});

/** An owner marks a warning as read: it stops showing for all the shop's owners. */
meRouter.post('/notices/:noticeId/read', async (req, res) => {
  const noticeId = idParam(req.params.noticeId, 'Notice');
  const userId = currentUser(req).id;
  const { rowCount } = await pool.query(
    `UPDATE shop_notices n SET read_at = COALESCE(n.read_at, now()), read_by = COALESCE(n.read_by, $2)
     WHERE n.id = $1 AND EXISTS (
       SELECT 1 FROM shop_members m
       WHERE m.shop_id = n.shop_id AND m.user_id = $2 AND m.role = 'OWNER'
     )`,
    [noticeId, userId],
  );
  if (!rowCount) throw notFound('Notice');
  res.status(204).end();
});

const pushTokenSchema = z
  .object({ token: z.string().trim().min(1).max(255), platform: z.enum(['android', 'ios']) })
  .strict();

/** Registers this device for push notifications; a token moves to the last signed-in user. */
meRouter.put('/push-token', async (req, res) => {
  const { token, platform } = pushTokenSchema.parse(req.body);
  await pool.query(
    `INSERT INTO push_tokens (token, user_id, platform) VALUES ($1, $2, $3)
     ON CONFLICT (token) DO UPDATE SET user_id = $2, platform = $3, updated_at = now()`,
    [token, currentUser(req).id, platform],
  );
  res.status(204).end();
});

/** At sign-out: this device stops receiving the user's notifications. */
meRouter.delete('/push-token', async (req, res) => {
  const { token } = pushTokenSchema.pick({ token: true }).parse(req.body);
  await pool.query('DELETE FROM push_tokens WHERE token = $1 AND user_id = $2', [
    token,
    currentUser(req).id,
  ]);
  res.status(204).end();
});
