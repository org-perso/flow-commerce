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

/** "HH:MM", 24 h. */
export const hourMinute = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:MM.');

/**
 * Time slot of the planned day: from only ("after 17:00"), to only ("before 11:00"), both
 * ("14:00-16:00"), or null for any time.
 */
export const timeSlot = z
  .object({ from: hourMinute.nullable().default(null), to: hourMinute.nullable().default(null) })
  .strict()
  .refine((s) => !s.from || !s.to || s.from < s.to, {
    message: 'The slot must end after it starts.',
    path: ['to'],
  })
  .transform((s) => (s.from || s.to ? s : null))
  .nullable();

export const pagination = {
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
};

/**
 * Paging for lists added after 1.0: without `limit`, the whole list (LIMIT NULL), as the
 * 1.0.x apps still installed expect.
 */
export const optionalPagination = {
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).default(0),
};

/** Query-string boolean: "true" / "false". */
export const queryBoolean = z
  .enum(['true', 'false'])
  .transform((v) => v === 'true')
  .optional();
