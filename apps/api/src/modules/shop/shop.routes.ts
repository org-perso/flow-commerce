import { Router } from 'express';

import { currentMember, currentShop, currentUser } from '../../http/context.js';
import { requirePermission } from './permissions.js';
import { createShop, listShopsForUser, updateShop } from './shop.repository.js';
import { createShopSchema, updateShopSchema } from './shop.schemas.js';

/** /shops — the shops the current user is a member of, with their role. */
export const shopsRouter = Router();

shopsRouter.get('/', async (req, res) => {
  res.json(await listShopsForUser(currentUser(req).id));
});

shopsRouter.post('/', async (req, res) => {
  const input = createShopSchema.parse(req.body);
  const shop = await createShop(currentUser(req).id, input);
  res.status(201).location(`${req.baseUrl}/${shop.id}`).json(shop);
});

/** /shops/:shopId — mounted behind requireShop. */
export const shopRouter = Router();

shopRouter.get('/', (req, res) => {
  res.json({ ...currentShop(req), role: currentMember(req).role });
});

shopRouter.patch('/', requirePermission('shop.settings'), async (req, res) => {
  const patch = updateShopSchema.parse(req.body);
  res.json({ ...(await updateShop(currentShop(req).id, patch)), role: currentMember(req).role });
});
