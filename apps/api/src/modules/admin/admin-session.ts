import type { CookieOptions, Request, RequestHandler, Response } from 'express';

import { env } from '../../config/env.js';
import { pool, type Db } from '../../db/pool.js';
import { ProblemError } from '../../http/problem.js';
import { randomToken, sha256 } from './admin-crypto.js';

export const ADMIN_COOKIE = 'fc_admin';

/** RG-81: 12 h at most, and 2 h without activity. The MFA step must be done within 5 min. */
export const SESSION_HOURS = 12;
export const IDLE_MINUTES = 120;
export const MFA_STEP_MINUTES = 5;

export type AdminStage = 'mfa' | 'full';

export type Admin = {
  id: string;
  username: string;
  name: string;
  mustChangePassword: boolean;
  mfaEnabled: boolean;
  mfaRequired: boolean;
};

export type AdminSession = { id: string; stage: AdminStage };

const cookieOptions = (maxAgeMs: number): CookieOptions => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api/v1/admin',
  maxAge: maxAgeMs,
});

function readCookie(req: Request, name: string): string | undefined {
  for (const part of (req.header('cookie') ?? '').split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

/** Opens a session and sets its cookie. */
export async function startSession(
  db: Db,
  req: Request,
  res: Response,
  adminId: string,
  stage: AdminStage,
): Promise<void> {
  const token = randomToken();
  const minutes = stage === 'full' ? SESSION_HOURS * 60 : MFA_STEP_MINUTES;
  await db.query(
    `INSERT INTO admin_sessions (admin_id, token_hash, stage, ip, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, $5, now() + make_interval(mins => $6))`,
    [
      adminId,
      sha256(token),
      stage,
      req.ip ?? null,
      req.header('user-agent')?.slice(0, 300) ?? null,
      minutes,
    ],
  );
  res.cookie(ADMIN_COOKIE, token, cookieOptions(minutes * 60_000));
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(ADMIN_COOKIE, { ...cookieOptions(0), maxAge: undefined });
}

/** The session of the cookie, if still valid, with its admin (disabled admins have none). */
async function findSession(req: Request): Promise<{ admin: Admin; session: AdminSession } | null> {
  const token = readCookie(req, ADMIN_COOKIE);
  if (!token) return null;
  const { rows } = await pool.query<
    Admin & { sessionId: string; stage: AdminStage; idle: boolean; touch: boolean }
  >(
    `SELECT a.id, a.username, a.name,
            a.must_change_password AS "mustChangePassword",
            a.mfa_enabled_at IS NOT NULL AS "mfaEnabled",
            a.mfa_required AS "mfaRequired",
            s.id AS "sessionId", s.stage,
            s.last_seen_at < now() - make_interval(mins => $2) AS idle,
            s.last_seen_at < now() - interval '1 minute' AS touch
     FROM admin_sessions s JOIN admin_users a ON a.id = s.admin_id
     WHERE s.token_hash = $1 AND s.expires_at > now() AND a.disabled_at IS NULL`,
    [sha256(token), IDLE_MINUTES],
  );
  const row = rows[0];
  if (!row) return null;
  if (row.stage === 'full' && row.idle) {
    await pool.query('DELETE FROM admin_sessions WHERE id = $1', [row.sessionId]);
    return null;
  }
  // Activity is recorded at most once a minute.
  if (row.touch) {
    await pool.query('UPDATE admin_sessions SET last_seen_at = now() WHERE id = $1', [
      row.sessionId,
    ]);
  }
  const admin: Admin = {
    id: row.id,
    username: row.username,
    name: row.name,
    mustChangePassword: row.mustChangePassword,
    mfaEnabled: row.mfaEnabled,
    mfaRequired: row.mfaRequired,
  };
  return { admin, session: { id: row.sessionId, stage: row.stage } };
}

const unauthorized = () =>
  new ProblemError(401, 'Unauthorized', 'Session admin absente ou expirée.');

/** Password checked, MFA pending: only the MFA routes accept this session. */
export const requireMfaStep: RequestHandler = async (req, _res, next) => {
  const found = await findSession(req);
  if (!found || found.session.stage !== 'mfa') throw unauthorized();
  req.admin = found.admin;
  req.adminSession = found.session;
  next();
};

/**
 * A fully signed-in admin. Until a temporary password is changed, only the routes passed
 * `{ allowPasswordChange: true }` (me, password, logout) are reachable.
 */
export function requireAdmin({ allowPasswordChange = false } = {}): RequestHandler {
  return async (req, _res, next) => {
    const found = await findSession(req);
    if (!found || found.session.stage !== 'full') throw unauthorized();
    if (found.admin.mustChangePassword && !allowPasswordChange) {
      throw new ProblemError(
        403,
        'Password Change Required',
        'Changez d’abord votre mot de passe.',
        {
          code: 'PASSWORD_CHANGE_REQUIRED',
        },
      );
    }
    req.admin = found.admin;
    req.adminSession = found.session;
    next();
  };
}

export function currentAdmin(req: Request): Admin {
  if (!req.admin) throw new Error('requireAdmin middleware missing');
  return req.admin;
}

export function currentAdminSession(req: Request): AdminSession {
  if (!req.adminSession) throw new Error('requireAdmin middleware missing');
  return req.adminSession;
}
