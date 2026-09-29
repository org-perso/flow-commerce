import type { RequestHandler } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';

import { env } from '../config/env.js';
import { ProblemError } from '../http/problem.js';

// Firebase ID tokens are standard JWTs signed with Google's public keys: no Admin SDK needed.
const jwks = createRemoteJWKSet(
  new URL(
    'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
  ),
);
const issuer = `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`;

export type AuthUser = {
  firebaseUid: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
};

declare module 'express-serve-static-core' {
  interface Request {
    authUser?: AuthUser;
  }
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
  if (!token) throw new ProblemError(401, 'Unauthorized', 'Missing Bearer token.');

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer,
      audience: env.FIREBASE_PROJECT_ID,
      algorithms: ['RS256'],
    });
    if (!payload.sub) throw new Error('Token has no subject');

    req.authUser = {
      firebaseUid: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : null,
      emailVerified: payload.email_verified === true,
      name: typeof payload.name === 'string' ? payload.name : null,
    };
  } catch {
    throw new ProblemError(401, 'Unauthorized', 'Invalid or expired token.');
  }
  next();
};

/** Use after requireAuth. */
export function getAuthUser(req: Parameters<RequestHandler>[0]): AuthUser {
  if (!req.authUser) throw new ProblemError(401, 'Unauthorized');
  return req.authUser;
}
