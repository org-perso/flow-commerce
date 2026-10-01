import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { verifyFirebaseToken, type TokenVerifier } from './auth/firebase-auth.js';
import { env } from './config/env.js';
import { errorHandler, notFound } from './http/problem.js';
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
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGINS }));
  app.use(express.json({ limit: '1mb' }));

  app.use('/api/v1', createApiRouter(verifyToken));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
