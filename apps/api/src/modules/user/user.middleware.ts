import type { RequestHandler } from 'express';

import { ProblemError } from '../../http/problem.js';
import { findOrCreateUser } from './user.repository.js';

/** Resolves the database user of the authenticated identity. Use after requireAuth. */
export const requireUser: RequestHandler = async (req, _res, next) => {
  if (!req.identity) throw new Error('requireAuth middleware missing');
  const { suspended, ...user } = await findOrCreateUser(req.identity);
  // RG-74: a suspended account is refused everywhere (its shops keep working for the others).
  if (suspended) {
    throw new ProblemError(
      403,
      'Account Suspended',
      'Votre compte est suspendu par Flow.Co. Contactez le support.',
      { code: 'ACCOUNT_SUSPENDED' },
    );
  }
  req.user = user;
  next();
};
