import { Router } from 'express';
import { z } from 'zod';

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
