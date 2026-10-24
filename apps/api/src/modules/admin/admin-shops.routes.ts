import { Router } from 'express';
import { z } from 'zod';

import { BUSINESS_TZ } from '../../config/time.js';
import { pool, withTransaction } from '../../db/pool.js';
import { idParam, notFound } from '../../http/params.js';
import { ProblemError } from '../../http/problem.js';
import { pagination } from '../../http/schemas.js';
import { listActions, logAction } from './admin-audit.js';
import { currentAdmin } from './admin-session.js';
import { actionSchema, noteSchema, reactivateSchema, warnSchema } from './admin.schemas.js';

// F-21, F-22: shops. Usage figures only, never their customers, products or orders (RG-71).

const listSchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(['active', 'suspended', 'flagged']).optional(),
  /** No order (or created without any) for at least this many days. */
  inactiveDays: z.coerce.number().int().min(1).max(3650).optional(),
  plan: z.enum(['FREE', 'PRO', 'BUSINESS']).optional(),
  ...pagination,
});

const summary = `s.id, s.name, s.status, s.plan, s.plan_ends_at AS "planEndsAt",
  s.flagged_at AS "flaggedAt",
  s.created_at AS "createdAt",
  json_build_object('id', u.id, 'name', u.name, 'email', u.email) AS owner,
  (SELECT count(*)::int FROM shop_members m WHERE m.shop_id = s.id) AS "membersCount",
  o.total AS "ordersCount", o.last30 AS "orders30Days",
  GREATEST(o.last_at, s.created_at) AS "lastActivityAt"`;

const ordersLateral = `LEFT JOIN LATERAL (
  SELECT count(*)::int AS total,
         count(*) FILTER (WHERE created_at > now() - interval '30 days')::int AS last30,
         max(created_at) AS last_at
  FROM orders WHERE shop_id = s.id
) o ON true`;

type ShopRow = { id: string; name: string; status: string; flaggedAt: Date | null };

async function findShop(shopId: string): Promise<ShopRow> {
  const { rows } = await pool.query<ShopRow>(
    'SELECT id, name, status, flagged_at AS "flaggedAt" FROM shops WHERE id = $1',
    [shopId],
  );
  if (!rows[0]) throw notFound('Shop');
  return rows[0];
}

export const adminShopsRouter = Router();

adminShopsRouter.get('/', async (req, res) => {
  const q = listSchema.parse(req.query);
  const { rows } = await pool.query(
    `SELECT ${summary}, count(*) OVER()::int AS "totalCount"
     FROM shops s JOIN users u ON u.id = s.owner_id ${ordersLateral}
     WHERE ($1::text IS NULL OR s.name ILIKE '%' || $1 || '%' OR u.email ILIKE '%' || $1 || '%'
              OR u.name ILIKE '%' || $1 || '%')
       AND ($2::text IS NULL
            OR ($2 = 'active' AND s.status = 'ACTIVE')
            OR ($2 = 'suspended' AND s.status = 'SUSPENDED')
            OR ($2 = 'flagged' AND s.flagged_at IS NOT NULL))
       AND ($3::int IS NULL
            OR GREATEST(o.last_at, s.created_at) < now() - make_interval(days => $3))
       AND ($4::text IS NULL OR s.plan = $4)
     ORDER BY s.created_at DESC
     LIMIT $5 OFFSET $6`,
    [q.search || null, q.status ?? null, q.inactiveDays ?? null, q.plan ?? null, q.limit, q.offset],
  );
  const total = rows[0]?.totalCount ?? 0;
  res.json({ items: rows.map(({ totalCount: _t, ...shop }) => shop), total });
});

adminShopsRouter.get('/:shopId', async (req, res) => {
  const shopId = idParam(req.params.shopId, 'Shop');
  const { rows } = await pool.query(
    `SELECT ${summary}, s.suspended_reason AS "suspendedReason", s.flag_reason AS "flagReason",
       json_build_object(
         'products',  (SELECT count(*)::int FROM products WHERE shop_id = s.id AND archived_at IS NULL),
         'customers', (SELECT count(*)::int FROM customers WHERE shop_id = s.id),
         'expenses',  (SELECT count(*)::int FROM expenses WHERE shop_id = s.id)
       ) AS counts,
       (SELECT COALESCE(json_agg(json_build_object(
                 'userId', mu.id, 'name', mu.name, 'email', mu.email,
                 'role', m.role, 'joinedAt', m.created_at) ORDER BY m.created_at), '[]')
        FROM shop_members m JOIN users mu ON mu.id = m.user_id
        WHERE m.shop_id = s.id) AS members,
       (SELECT COALESCE(json_agg(json_build_object('month', month, 'orders', n) ORDER BY month), '[]')
        FROM (SELECT to_char(date_trunc('month', created_at AT TIME ZONE '${BUSINESS_TZ}'), 'YYYY-MM') AS month,
                     count(*)::int AS n
              FROM orders WHERE shop_id = s.id
                AND created_at > date_trunc('month', now()) - interval '5 months'
              GROUP BY 1) per_month) AS "ordersByMonth",
       (SELECT COALESCE(json_agg(json_build_object(
                 'id', n.id, 'body', n.body, 'createdAt', n.created_at,
                 'admin', json_build_object('id', a.id, 'username', a.username, 'name', a.name))
                 ORDER BY n.created_at DESC), '[]')
        FROM admin_shop_notes n JOIN admin_users a ON a.id = n.admin_id
        WHERE n.shop_id = s.id) AS notes,
       (SELECT COALESCE(json_agg(json_build_object(
                 'id', x.id, 'reason', x.reason, 'message', x.message,
                 'createdAt', x.created_at, 'readAt', x.read_at) ORDER BY x.created_at DESC), '[]')
        FROM shop_notices x WHERE x.shop_id = s.id) AS notices
     FROM shops s JOIN users u ON u.id = s.owner_id ${ordersLateral}
     WHERE s.id = $1`,
    [shopId],
  );
  if (!rows[0]) throw notFound('Shop');
  res.json(rows[0]);
});

adminShopsRouter.get('/:shopId/actions', async (req, res) => {
  const shop = await findShop(idParam(req.params.shopId, 'Shop'));
  res.json(await listActions(pool, 'shop', shop.id));
});

/** Message to the owners, shown in the app until read (RG-77). */
adminShopsRouter.post('/:shopId/warn', async (req, res) => {
  const shop = await findShop(idParam(req.params.shopId, 'Shop'));
  const body = warnSchema.parse(req.body);
  const admin = currentAdmin(req);
  const notice = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO shop_notices (shop_id, admin_id, reason, message) VALUES ($1, $2, $3, $4)
       RETURNING id, reason, message, created_at AS "createdAt", read_at AS "readAt"`,
      [shop.id, admin.id, body.reason, body.message],
    );
    await logAction(client, admin.id, {
      action: 'SHOP_WARNED',
      targetType: 'shop',
      targetId: shop.id,
      targetLabel: shop.name,
      reason: body.reason,
      details: body.message,
    });
    return rows[0];
  });
  res.status(201).json(notice);
});

/** "To watch": internal only, the seller sees nothing (RG-76). */
adminShopsRouter.post('/:shopId/flag', async (req, res) => {
  const shop = await findShop(idParam(req.params.shopId, 'Shop'));
  const body = actionSchema.parse(req.body);
  await setState(req, shop, 'SHOP_FLAGGED', body, (client) =>
    client.query('UPDATE shops SET flagged_at = now(), flag_reason = $2 WHERE id = $1', [
      shop.id,
      body.details ?? body.reason,
    ]),
  );
  res.json(await findShop(shop.id));
});

adminShopsRouter.post('/:shopId/unflag', async (req, res) => {
  const shop = await findShop(idParam(req.params.shopId, 'Shop'));
  const body = reactivateSchema.parse(req.body ?? {});
  if (!shop.flaggedAt)
    throw new ProblemError(409, 'Conflict', 'Cette boutique n’est pas signalée.');
  await setState(req, shop, 'SHOP_UNFLAGGED', body, (client) =>
    client.query('UPDATE shops SET flagged_at = NULL, flag_reason = NULL WHERE id = $1', [shop.id]),
  );
  res.json(await findShop(shop.id));
});

/** RG-73: read-only for every member; nothing is deleted. */
adminShopsRouter.post('/:shopId/suspend', async (req, res) => {
  const shop = await findShop(idParam(req.params.shopId, 'Shop'));
  const body = actionSchema.parse(req.body);
  if (shop.status === 'SUSPENDED') throw new ProblemError(409, 'Conflict', 'Déjà suspendue.');
  await setState(req, shop, 'SHOP_SUSPENDED', body, (client) =>
    client.query(`UPDATE shops SET status = 'SUSPENDED', suspended_reason = $2 WHERE id = $1`, [
      shop.id,
      body.details ?? null,
    ]),
  );
  res.json(await findShop(shop.id));
});

adminShopsRouter.post('/:shopId/reactivate', async (req, res) => {
  const shop = await findShop(idParam(req.params.shopId, 'Shop'));
  const body = reactivateSchema.parse(req.body ?? {});
  if (shop.status !== 'SUSPENDED') throw new ProblemError(409, 'Conflict', 'Pas suspendue.');
  await setState(req, shop, 'SHOP_REACTIVATED', body, (client) =>
    client.query(`UPDATE shops SET status = 'ACTIVE', suspended_reason = NULL WHERE id = $1`, [
      shop.id,
    ]),
  );
  res.json(await findShop(shop.id));
});

/** Internal note, admins only. */
adminShopsRouter.post('/:shopId/notes', async (req, res) => {
  const shop = await findShop(idParam(req.params.shopId, 'Shop'));
  const { body } = noteSchema.parse(req.body);
  const { rows } = await pool.query(
    `INSERT INTO admin_shop_notes (shop_id, admin_id, body) VALUES ($1, $2, $3)
     RETURNING id, body, created_at AS "createdAt"`,
    [shop.id, currentAdmin(req).id, body],
  );
  res.status(201).json(rows[0]);
});

/** Applies a state change and logs it, in one transaction. */
async function setState(
  req: Parameters<typeof currentAdmin>[0],
  shop: ShopRow,
  action: string,
  body: { reason?: (typeof actionSchema)['_output']['reason']; details?: string | null },
  update: (client: import('pg').PoolClient) => Promise<unknown>,
) {
  await withTransaction(async (client) => {
    await update(client);
    await logAction(client, currentAdmin(req).id, {
      action,
      targetType: 'shop',
      targetId: shop.id,
      targetLabel: shop.name,
      reason: body.reason ?? null,
      details: body.details ?? null,
    });
  });
}
