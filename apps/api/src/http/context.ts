import type { Request } from 'express';

import type { Member, Shop } from '../modules/shop/shop.repository.js';
import type { User } from '../modules/user/user.repository.js';

// Accessors for the request context. They throw if a route forgot its middleware,
// which is a programming error (500), never a client error.

export function currentUser(req: Request): User {
  if (!req.user) throw new Error('requireUser middleware missing');
  return req.user;
}

export function currentShop(req: Request): Shop {
  if (!req.shop) throw new Error('requireShop middleware missing');
  return req.shop;
}

/** Id of the current shop: the only source of shop_id for shop-scoped queries. */
export function currentShopId(req: Request): string {
  return currentShop(req).id;
}

/** The current user's membership (role) in the current shop. */
export function currentMember(req: Request): Member {
  if (!req.member) throw new Error('requireShop middleware missing');
  return req.member;
}
