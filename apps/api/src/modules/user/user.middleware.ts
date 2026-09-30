import type { RequestHandler } from 'express';

import { findOrCreateUser } from './user.repository.js';

/** Resolves the database user of the authenticated identity. Use after requireAuth. */
export const requireUser: RequestHandler = async (req, _res, next) => {
  if (!req.identity) throw new Error('requireAuth middleware missing');
  req.user = await findOrCreateUser(req.identity);
  next();
};
