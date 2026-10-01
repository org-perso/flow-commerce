import { Router } from 'express';
import { z } from 'zod';

import { pool } from '../../db/pool.js';
import { currentUser } from '../../http/context.js';
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
