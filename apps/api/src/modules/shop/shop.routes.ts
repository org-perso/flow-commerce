import { Router } from 'express';

import { currentShop, currentUser } from '../../http/context.js';
import { createShop, listShopsByOwner, updateShop } from './shop.repository.js';
import { createShopSchema, updateShopSchema } from './shop.schemas.js';

/** /shops — the current user's shops. */
export const shopsRouter = Router();

shopsRouter.get('/', async (req, res) => {
  res.json(await listShopsByOwner(currentUser(req).id));
});

shopsRouter.post('/', async (req, res) => {
  const input = createShopSchema.parse(req.body);
  const shop = await createShop(currentUser(req).id, input);
  res.status(201).location(`${req.baseUrl}/${shop.id}`).json(shop);
});

/** /shops/:shopId — mounted behind requireShop. */
export const shopRouter = Router();

shopRouter.get('/', (req, res) => {
  res.json(currentShop(req));
});

shopRouter.patch('/', async (req, res) => {
  const patch = updateShopSchema.parse(req.body);
  res.json(await updateShop(currentShop(req).id, patch));
});
