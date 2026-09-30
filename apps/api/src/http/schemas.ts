import { z } from 'zod';

/** Integer Ariary amount. */
export const amount = z.number().int().min(0).max(1_000_000_000_000);

/** Optional free text: trimmed, empty string becomes null. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null)
    .nullable();

export const requiredText = (max: number) => z.string().trim().min(1, 'Required.').max(max);

/** YYYY-MM-DD calendar date. */
export const isoDate = z.iso.date();

export const pagination = {
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
};

/** Query-string boolean: "true" / "false". */
export const queryBoolean = z
  .enum(['true', 'false'])
  .transform((v) => v === 'true')
  .optional();
