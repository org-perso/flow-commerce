import type { RequestHandler } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';

import { env } from '../config/env.js';
import { ProblemError } from '../http/problem.js';

export type AuthIdentity = {
  firebaseUid: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
};

/** Returns the identity for a valid token, throws otherwise. */
export type TokenVerifier = (token: string) => Promise<AuthIdentity>;

// Firebase ID tokens are standard JWTs signed with Google's public keys: no Admin SDK needed.
const jwks = createRemoteJWKSet(
  new URL(
    'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
  ),
);

export const verifyFirebaseToken: TokenVerifier = async (token) => {
  const { payload } = await jwtVerify(token, jwks, {
    issuer: `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`,
    audience: env.FIREBASE_PROJECT_ID,
    algorithms: ['RS256'],
  });
  if (!payload.sub) throw new Error('Token has no subject');

  return {
    firebaseUid: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : null,
    emailVerified: payload.email_verified === true,
    name: typeof payload.name === 'string' ? payload.name : null,
  };
};

export function requireAuth(verifyToken: TokenVerifier): RequestHandler {
  return async (req, _res, next) => {
    const header = req.header('authorization');
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
    if (!token) throw new ProblemError(401, 'Unauthorized', 'Missing Bearer token.');

    try {
      req.identity = await verifyToken(token);
    } catch {
      throw new ProblemError(401, 'Unauthorized', 'Invalid or expired token.');
    }
    next();
  };
}
