import { Router } from 'express';

import { getAuthUser, requireAuth } from '../auth/firebase-auth.js';
import { pool } from '../db/pool.js';

export const meRouter = Router();

meRouter.use(requireAuth);

/** Returns the current user, creating it on first call (sign-up happens in Firebase). */
meRouter.get('/', async (req, res) => {
  const authUser = getAuthUser(req);
  const { rows } = await pool.query(
    `INSERT INTO users (firebase_uid, email, name)
     VALUES ($1, $2, $3)
     ON CONFLICT (firebase_uid) DO UPDATE SET email = EXCLUDED.email
     RETURNING id, email, name, phone, created_at, updated_at`,
    [authUser.firebaseUid, authUser.email, authUser.name],
  );
  const user = rows[0];
  const shop = await pool.query('SELECT id, name, description FROM shops WHERE owner_id = $1', [
    user.id,
  ]);

  res.json({
    id: user.id,
    email: user.email,
    emailVerified: authUser.emailVerified,
    name: user.name,
    phone: user.phone,
    shop: shop.rows[0] ?? null,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  });
});
