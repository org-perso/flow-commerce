import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { verifyFirebaseToken, type TokenVerifier } from './auth/firebase-auth.js';
import { env } from './config/env.js';
import { errorHandler, notFound } from './http/problem.js';
import { createApiRouter } from './routes.js';

type AppDeps = {
  /** Injectable so tests do not need real Firebase tokens. */
  verifyToken?: TokenVerifier;
};

export function createApp({ verifyToken = verifyFirebaseToken }: AppDeps = {}) {
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
