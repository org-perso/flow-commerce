import type { AuthIdentity } from '../auth/firebase-auth.js';
import type { Member, Shop } from '../modules/shop/shop.repository.js';
import type { User } from '../modules/user/user.repository.js';

// Request context filled by the middleware chain: requireAuth → requireUser → requireShop.
declare module 'express-serve-static-core' {
  interface Request {
    identity?: AuthIdentity;
    user?: User;
    shop?: Shop;
    member?: Member;
  }
}
