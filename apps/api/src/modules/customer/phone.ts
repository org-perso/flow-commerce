import { z } from 'zod';

/**
 * Normalizes a phone number so the same number always compares equal:
 * "034 12 345 67", "+261 34 12 345 67" and "0341234567" all give "0341234567".
 * Returns null when there are no digits.
 */
export function normalizePhone(value: string | null | undefined): string | null {
  const digits = (value ?? '').replace(/\D/g, '');
  if (!digits) return null;
  // Madagascar: +261 34 ... (12 digits) is the national 034 ... (10 digits).
  if (/^261\d{9}$/.test(digits)) return `0${digits.slice(3)}`;
  return digits;
}

/** Optional phone field: any formatting accepted, must hold 6 to 15 digits. */
export const phoneField = z
  .string()
  .trim()
  .max(30)
  .transform((v) => normalizePhone(v))
  .refine((v) => v === null || (v.length >= 6 && v.length <= 15), 'Invalid phone number.')
  .nullable();

/** Digits to search for in stored phones: "+261 34" → "034", "034 12" → "03412". */
export function phoneSearchDigits(query: string): string | null {
  const digits = query.replace(/\D/g, '');
  if (!digits) return null;
  return digits.startsWith('261') ? `0${digits.slice(3)}` : digits;
}
