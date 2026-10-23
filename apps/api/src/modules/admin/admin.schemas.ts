import { z } from 'zod';

import { optionalText, requiredText } from '../../http/schemas.js';
import { ACTION_REASONS } from './admin-audit.js';

/** Lowercase letters, digits, ".", "_" and "-": usernames are compared as typed. */
export const username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9._-]{3,50}$/, '3 à 50 caractères : lettres, chiffres, . _ -');

/** RG-80: at least 12 characters. */
export const newPassword = z.string().min(12, '12 caractères minimum.').max(200);

/** Body of an action on a shop or a user: a reason from the list, and optional details. */
export const actionSchema = z
  .object({ reason: z.enum(ACTION_REASONS), details: optionalText(1000).optional() })
  .strict();

export const reactivateSchema = z.object({ details: optionalText(1000).optional() }).strict();

export const warnSchema = z
  .object({ reason: z.enum(ACTION_REASONS), message: requiredText(2000) })
  .strict();

export const noteSchema = z.object({ body: requiredText(5000) }).strict();
