import { Router } from 'express';

import { requireAuth, type TokenVerifier } from './auth/firebase-auth.js';
import { pool } from './db/pool.js';
import { categoriesRouter } from './modules/category/category.routes.js';
import { customersRouter } from './modules/customer/customer.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { expensesRouter } from './modules/expense/expense.routes.js';
import { ordersRouter } from './modules/order/order.routes.js';
import { productsRouter } from './modules/product/product.routes.js';
import { requireShop } from './modules/shop/shop.middleware.js';
import { shopRouter, shopsRouter } from './modules/shop/shop.routes.js';
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

  // Everything below /shops/:shopId is scoped to a shop owned by the current user.
  const shopScoped = Router({ mergeParams: true });
  shopScoped.use(requireShop);
  shopScoped.use('/', shopRouter);
  shopScoped.use('/categories', categoriesRouter);
  shopScoped.use('/products', productsRouter);
  shopScoped.use('/customers', customersRouter);
  shopScoped.use('/orders', ordersRouter);
  shopScoped.use('/expenses', expensesRouter);
  shopScoped.use('/dashboard', dashboardRouter);
  api.use('/shops/:shopId', shopScoped);

  return api;
}
