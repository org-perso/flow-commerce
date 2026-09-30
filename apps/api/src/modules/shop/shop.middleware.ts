import type { RequestHandler } from 'express';
import { z } from 'zod';

import { currentUser } from '../../http/context.js';
import { ProblemError } from '../../http/problem.js';
import { findShopForOwner } from './shop.repository.js';

const shopIdSchema = z.uuid();

/**
 * Loads the shop from the `:shopId` path param, checking it belongs to the current user.
 * Every shop-scoped route (products, orders, ...) goes through this: the client picks
 * the shop, the server checks ownership. Someone else's shop answers 404, not 403,
 * so shop ids cannot be probed.
 */
export const requireShop: RequestHandler = async (req, _res, next) => {
  const shopId = shopIdSchema.safeParse(req.params.shopId);
  const shop = shopId.success ? await findShopForOwner(shopId.data, currentUser(req).id) : null;
  if (!shop) throw new ProblemError(404, 'Not Found', 'Shop not found.');
  req.shop = shop;
  next();
};
