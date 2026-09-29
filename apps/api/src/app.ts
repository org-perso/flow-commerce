import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { env } from './config/env.js';
import { errorHandler, notFound } from './http/problem.js';
import { healthRouter } from './routes/health.js';
import { meRouter } from './routes/me.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGINS }));
  app.use(express.json({ limit: '1mb' }));

  const api = express.Router();
  api.use('/health', healthRouter);
  api.use('/me', meRouter);
  app.use('/api/v1', api);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
