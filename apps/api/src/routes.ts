import { Router } from 'express';

import { requireAuth, type TokenVerifier } from './auth/firebase-auth.js';
import { pool } from './db/pool.js';
import { categoriesRouter } from './modules/category/category.routes.js';
import { customersRouter } from './modules/customer/customer.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { expensesRouter } from './modules/expense/expense.routes.js';
import { deliveriesRouter } from './modules/notification/notification.routes.js';
import { driverRouteRouter, ordersRouter } from './modules/order/order.routes.js';
import { reportsRouter } from './modules/report/report.routes.js';
import { productsRouter } from './modules/product/product.routes.js';
import {
  hideCostsUnlessAllowed,
  requireAnyPermission,
  requirePermission,
  requireReadWrite,
} from './modules/shop/permissions.js';
import { requireShop } from './modules/shop/shop.middleware.js';
import { shopRouter, shopsRouter } from './modules/shop/shop.routes.js';
import {
  driversRouter,
  invitationsRouter,
  joinRouter,
  leaveRouter,
  membersRouter,
  myMembershipRouter,
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
  shopScoped.use('/drivers', driversRouter);
  shopScoped.use('/invitations', invitationsRouter);
  shopScoped.use('/leave', leaveRouter);
  shopScoped.use('/me', myMembershipRouter);
  const catalog = requireReadWrite('catalog.read', 'catalog.write');
  shopScoped.use('/categories', catalog, categoriesRouter);
  shopScoped.use('/products', catalog, productsRouter);
  shopScoped.use('/customers', requirePermission('customers'), customersRouter);
  // Drivers reach their own deliveries; each order route checks which ones.
  shopScoped.use('/orders', requireAnyPermission('orders', 'deliveries'), ordersRouter);
  // The driver's own round first: the notify routes below are for owner, manager, CM.
  shopScoped.use('/deliveries', driverRouteRouter);
  shopScoped.use('/deliveries', deliveriesRouter);
  shopScoped.use('/expenses', requirePermission('expenses'), expensesRouter);
  shopScoped.use('/dashboard', requirePermission('dashboard'), dashboardRouter);
  shopScoped.use('/reports', requirePermission('orders'), reportsRouter);
  api.use('/shops/:shopId', shopScoped);

  return api;
}
