import type { AuthIdentity } from '../../auth/firebase-auth.js';
import { pool } from '../../db/pool.js';

export type User = {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const columns = `id, email, name, phone, created_at AS "createdAt", updated_at AS "updatedAt"`;

/**
 * Returns the user for this Firebase identity, creating it on first sight
 * (sign-up happens in Firebase, the API learns about users lazily).
 */
export async function findOrCreateUser(identity: AuthIdentity): Promise<User> {
  const existing = await pool.query<User>(`SELECT ${columns} FROM users WHERE firebase_uid = $1`, [
    identity.firebaseUid,
  ]);
  if (existing.rows[0]) return existing.rows[0];

  // ON CONFLICT covers two concurrent first requests for the same user.
  const { rows } = await pool.query<User>(
    `INSERT INTO users (firebase_uid, email, name) VALUES ($1, $2, $3)
     ON CONFLICT (firebase_uid) DO UPDATE SET firebase_uid = EXCLUDED.firebase_uid
     RETURNING ${columns}`,
    [identity.firebaseUid, identity.email, identity.name],
  );
  return rows[0]!;
}

export async function updateUser(
  id: string,
  patch: { name?: string | null; phone?: string | null },
): Promise<User> {
  const { rows } = await pool.query<User>(
    `UPDATE users SET
       name  = CASE WHEN $2::boolean THEN $3 ELSE name END,
       phone = CASE WHEN $4::boolean THEN $5 ELSE phone END
     WHERE id = $1
     RETURNING ${columns}`,
    [
      id,
      patch.name !== undefined,
      patch.name ?? null,
      patch.phone !== undefined,
      patch.phone ?? null,
    ],
  );
  return rows[0]!;
}
