import { Router } from 'express';
import { z } from 'zod';

import { currentShopId } from '../../http/context.js';
import { requiredText } from '../../http/schemas.js';
import { insertCategory, listCategories } from './category.repository.js';

const createCategorySchema = z.object({ name: requiredText(100) });

/** /shops/:shopId/categories */
export const categoriesRouter = Router();

categoriesRouter.get('/', async (req, res) => {
  res.json(await listCategories(currentShopId(req)));
});

categoriesRouter.post('/', async (req, res) => {
  const { name } = createCategorySchema.parse(req.body);
  res.status(201).json(await insertCategory(currentShopId(req), name));
});
