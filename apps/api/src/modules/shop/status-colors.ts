import { z } from 'zod';

import { ORDER_STATUSES } from '../order/order-status.js';

/** What can be colored: each order status, and the payment (paid / not paid). */
export const COLORED_STATES = [...ORDER_STATUSES, 'PAID', 'UNPAID'] as const;

/** Palette shared with the apps, which hold the actual light / dark shades of each key. */
export const STATUS_COLOR_KEYS = [
  'gray',
  'sand',
  'slate',
  'blue',
  'indigo',
  'cyan',
  'amber',
  'orange',
  'yellow',
  'violet',
  'sky',
  'teal',
  'green',
  'emerald',
  'lime',
  'red',
  'charcoal',
  'crimson',
  'raspberry',
  'rust',
  'plum',
  'pink',
] as const;

const colorKey = z.enum(STATUS_COLOR_KEYS);

/** Only the states the shop changed; a missing state keeps its default color. */
export const statusColorsSchema = z
  .object(
    Object.fromEntries(COLORED_STATES.map((s) => [s, colorKey.optional()])) as Record<
      (typeof COLORED_STATES)[number],
      z.ZodOptional<typeof colorKey>
    >,
  )
  .strict();

export type StatusColors = z.infer<typeof statusColorsSchema>;
