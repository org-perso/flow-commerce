import { Router } from 'express';
import { z } from 'zod';

import { currentMember, currentShopId } from '../../http/context.js';
import { ProblemError } from '../../http/problem.js';
import { can } from '../shop/permissions.js';
import { uploadSignature, type UploadKind } from './cloudinary.js';

/** Which permission each kind of photo needs: the same as saving it on its target. */
const PERMISSION = { product: 'catalog.write', logo: 'shop.settings' } as const;

const bodySchema = z.object({ kind: z.enum(['product', 'logo']) }).strict();

/** /shops/:shopId/uploads — mounted behind requireShop. */
export const uploadsRouter = Router();

uploadsRouter.post('/signature', (req, res) => {
  const { kind } = bodySchema.parse(req.body);
  if (!can(currentMember(req).role, PERMISSION[kind as UploadKind])) {
    throw new ProblemError(403, 'Forbidden', 'Votre rôle ne permet pas d’envoyer cette photo.');
  }
  res.json(uploadSignature(currentShopId(req), kind));
});
