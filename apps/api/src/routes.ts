import { Router } from 'express';

import { requireAuth, type TokenVerifier } from './auth/firebase-auth.js';
import { pool } from './db/pool.js';
import { categoriesRouter } from './modules/category/category.routes.js';
import { customersRouter } from './modules/customer/customer.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { expensesRouter } from './modules/expense/expense.routes.js';
import { ordersRouter } from './modules/order/order.routes.js';
import { productsRouter } from './modules/product/product.routes.js';
import {
  hideCostsUnlessAllowed,
  requirePermission,
  requireReadWrite,
} from './modules/shop/permissions.js';
import { requireShop } from './modules/shop/shop.middleware.js';
import { shopRouter, shopsRouter } from './modules/shop/shop.routes.js';
import {
  invitationsRouter,
  joinRouter,
  leaveRouter,
  membersRouter,
} from './modules/team/team.routes.js';
import { meRouter } from './modules/user/me.routes.js';
import { requireUser } from './modules/user/user.middleware.js';

export function createApiRouter(verifyToken: TokenVerifier) {
  const api = Router();

  api.get('/health', async (_req, res) => {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  });

  // Everything below requires a signed-in user.
  api.use(requireAuth(verifyToken), requireUser);
  api.use('/me', meRouter);
  api.use('/shops', shopsRouter);
  api.use('/invitations', joinRouter);

  // Everything below /shops/:shopId is scoped to a shop the current user is a member of,
  // and each area checks the permission of their role (af-v2 §4).
  const shopScoped = Router({ mergeParams: true });
  shopScoped.use(requireShop, hideCostsUnlessAllowed);
  shopScoped.use('/', shopRouter);
  shopScoped.use('/members', membersRouter);
  shopScoped.use('/invitations', invitationsRouter);
  shopScoped.use('/leave', leaveRouter);
  const catalog = requireReadWrite('catalog.read', 'catalog.write');
  shopScoped.use('/categories', catalog, categoriesRouter);
  shopScoped.use('/products', catalog, productsRouter);
  shopScoped.use('/customers', requirePermission('customers'), customersRouter);
  shopScoped.use('/orders', requirePermission('orders'), ordersRouter);
  shopScoped.use('/expenses', requirePermission('expenses'), expensesRouter);
  shopScoped.use('/dashboard', requirePermission('dashboard'), dashboardRouter);
  api.use('/shops/:shopId', shopScoped);

  return api;
}
