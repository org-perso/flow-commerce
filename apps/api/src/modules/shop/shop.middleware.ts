import type { RequestHandler } from 'express';
import { z } from 'zod';

import { currentUser } from '../../http/context.js';
import { ProblemError } from '../../http/problem.js';
import { findShopForMember } from './shop.repository.js';

const shopIdSchema = z.uuid();

/**
 * Loads the shop from the `:shopId` path param, checking the current user is a member,
 * and their role. Every shop-scoped route (products, orders, ...) goes through this: the
 * client picks the shop, the server checks membership. A shop the user is not a member of
 * answers 404, not 403, so shop ids cannot be probed.
 */
export const requireShop: RequestHandler = async (req, _res, next) => {
  const user = currentUser(req);
  const shopId = shopIdSchema.safeParse(req.params.shopId);
  const found = shopId.success ? await findShopForMember(shopId.data, user.id) : null;
  if (!found) throw new ProblemError(404, 'Not Found', 'Shop not found.');
  req.shop = found.shop;
  req.member = { userId: user.id, role: found.role };
  next();
};
