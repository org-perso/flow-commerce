import { z } from 'zod';

import {
  amount,
  optionalText,
  pagination,
  queryBoolean,
  requiredText,
} from '../../http/schemas.js';

const fields = {
  name: requiredText(150),
  description: optionalText(2000),
  image: z.url().max(500).nullable(),
  categoryId: z.uuid().nullable(),
  purchasePrice: amount,
  sellingPrice: amount,
  lowStockThreshold: z.number().int().min(0).max(1_000_000),
};

export const createProductSchema = z
  .object({
    name: fields.name,
    description: fields.description.default(null),
    image: fields.image.default(null),
    categoryId: fields.categoryId.default(null),
    purchasePrice: fields.purchasePrice,
    sellingPrice: fields.sellingPrice,
    lowStockThreshold: fields.lowStockThreshold.default(0),
    /** Recorded as an AJOUT stock movement. */
    initialStock: z.number().int().min(0).max(1_000_000).default(0),
  })
  .strict();

export const updateProductSchema = z
  .object({
    name: fields.name,
    description: fields.description,
    image: fields.image,
    categoryId: fields.categoryId,
    purchasePrice: fields.purchasePrice,
    sellingPrice: fields.sellingPrice,
    lowStockThreshold: fields.lowStockThreshold,
  })
  .partial()
  .strict();

export const listProductsQuery = z.object({
  q: z.string().trim().max(150).optional(),
  categoryId: z.uuid().optional(),
  lowStock: queryBoolean,
  archived: queryBoolean,
});

/**
 * Manual stock movement. VENTE and RETOUR are reserved for orders.
 * AJOUT / RETRAIT take a positive quantity; AJUSTEMENT takes a signed correction.
 */
export const createStockMovementSchema = z
  .object({
    type: z.enum(['AJOUT', 'RETRAIT', 'AJUSTEMENT']),
    quantity: z
      .number()
      .int()
      .min(-1_000_000)
      .max(1_000_000)
      .refine((q) => q !== 0, 'Must not be 0.'),
    reason: optionalText(500).default(null),
  })
  .refine((m) => m.type === 'AJUSTEMENT' || m.quantity > 0, {
    message: 'Must be positive for AJOUT and RETRAIT.',
    path: ['quantity'],
  });

export const listMovementsQuery = z.object(pagination);
