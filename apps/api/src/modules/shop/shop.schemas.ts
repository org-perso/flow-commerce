import { z } from 'zod';

import { statusColorsSchema } from './status-colors.js';

const name = z.string().trim().min(1, 'Name is required.').max(150);
const description = z
  .string()
  .trim()
  .max(1000)
  .transform((v) => v || null)
  .nullable();

export const createShopSchema = z.object({
  name,
  description: description.optional().transform((v) => v ?? null),
});

export const updateShopSchema = z
  .object({
    name: name.optional(),
    description: description.optional(),
    /** The whole set of chosen colors; {} goes back to the defaults. */
    statusColors: statusColorsSchema.optional(),
  })
  .refine((v) => Object.values(v).some((field) => field !== undefined), {
    message: 'Provide at least one field to update.',
  });
