import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { verifyFirebaseToken, type TokenVerifier } from './auth/firebase-auth.js';
import { env } from './config/env.js';
import { errorHandler, notFound } from './http/problem.js';
import { createAdminRouter } from './modules/admin/admin.routes.js';
import { setPushSender } from './modules/notification/notification.service.js';
import type { PushSender } from './modules/notification/push.js';
import { createApiRouter } from './routes.js';

type AppDeps = {
  /** Injectable so tests do not need real Firebase tokens. */
  verifyToken?: TokenVerifier;
  /** Injectable so tests record push notifications instead of calling Expo. */
  sendPush?: PushSender;
};

export function createApp({ verifyToken = verifyFirebaseToken, sendPush }: AppDeps = {}) {
  if (sendPush) setPushSender(sendPush);
  const app = express();

  app.disable('x-powered-by');
  // Behind Render's proxy: req.ip is the client's address (admin lockout and audit).
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(express.json({ limit: '1mb' }));

  // The admin space has its own CORS (cookies) and sign-in: mounted before the seller API.
  app.use('/api/v1/admin', createAdminRouter());

  app.use(cors({ origin: env.CORS_ORIGINS }));
  app.use('/api/v1', createApiRouter(verifyToken));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
