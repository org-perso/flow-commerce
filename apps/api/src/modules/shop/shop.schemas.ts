import { z } from 'zod';

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
  .object({ name: name.optional(), description: description.optional() })
  .refine((v) => v.name !== undefined || v.description !== undefined, {
    message: 'Provide at least one field to update.',
  });
