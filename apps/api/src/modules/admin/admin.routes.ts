import cors from 'cors';
import { Router } from 'express';

import { env } from '../../config/env.js';
import { ProblemError } from '../../http/problem.js';
import { adminAuthRouter } from './admin-auth.routes.js';
import { adminDashboardRouter } from './admin-dashboard.routes.js';
import { adminShopsRouter } from './admin-shops.routes.js';
import { adminSubscriptionsRouter } from './admin-subscriptions.routes.js';
import { adminUsersRouter } from './admin-users.routes.js';
import { adminsRouter } from './admins.routes.js';
import { requireAdmin } from './admin-session.js';

/**
 * /api/v1/admin: the platform admin space (af-v3-admin). Its own sign-in (cookie session +
 * MFA), never a Firebase token; CORS with credentials, for the admin origins only (RG-85).
 */
export function createAdminRouter() {
  const admin = Router();
  admin.use(cors({ origin: env.ADMIN_CORS_ORIGINS, credentials: true }));

  admin.use('/auth', adminAuthRouter);
  admin.use(requireAdmin());
  admin.use('/dashboard', adminDashboardRouter);
  admin.use('/shops', adminShopsRouter);
  admin.use('/users', adminUsersRouter);
  admin.use('/admins', adminsRouter);
  admin.use('/', adminSubscriptionsRouter);

  // Unknown admin routes stop here: they must not fall through to the seller API.
  admin.use((req) => {
    throw new ProblemError(404, 'Not Found', `No route for ${req.method} ${req.originalUrl}`);
  });
  return admin;
}
