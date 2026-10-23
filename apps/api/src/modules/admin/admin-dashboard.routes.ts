import { Router } from 'express';
import { z } from 'zod';

import { BUSINESS_TZ } from '../../config/time.js';
import { pool } from '../../db/pool.js';

// F-20: platform figures. Counts and dates only, never seller data (RG-71).

const localDate = (column: string) => `(${column} AT TIME ZONE '${BUSINESS_TZ}')::date`;
const today = `(now() AT TIME ZONE '${BUSINESS_TZ}')::date`;

export const adminDashboardRouter = Router();

adminDashboardRouter.get('/', async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT
       json_build_object(
         'total',     (SELECT count(*) FROM users),
         'today',     (SELECT count(*) FROM users WHERE ${localDate('created_at')} = ${today}),
         'last7Days', (SELECT count(*) FROM users WHERE created_at > now() - interval '7 days'),
         'last30Days',(SELECT count(*) FROM users WHERE created_at > now() - interval '30 days'),
         'suspended', (SELECT count(*) FROM users WHERE suspended_at IS NOT NULL)
       ) AS users,
       json_build_object(
         'total',     (SELECT count(*) FROM shops),
         'active',    (SELECT count(DISTINCT shop_id) FROM orders
                       WHERE created_at > now() - interval '7 days'),
         'last30Days',(SELECT count(*) FROM shops WHERE created_at > now() - interval '30 days'),
         'suspended', (SELECT count(*) FROM shops WHERE status = 'SUSPENDED'),
         'flagged',   (SELECT count(*) FROM shops WHERE flagged_at IS NOT NULL)
       ) AS shops,
       json_build_object(
         'today',     (SELECT count(*) FROM orders WHERE ${localDate('created_at')} = ${today}),
         'last30Days',(SELECT count(*) FROM orders WHERE created_at > now() - interval '30 days')
       ) AS orders,
       json_build_object(
         'byPlan', (SELECT COALESCE(json_object_agg(plan, n), '{}')
                    FROM (SELECT plan, count(*) AS n FROM shops GROUP BY plan) p)
       ) AS plans`,
  );
  res.json(rows[0]);
});

const activitySchema = z.object({ days: z.coerce.number().int().min(1).max(90).default(30) });

/** One row per day (business time zone), oldest first: orders, sign-ups and new shops. */
adminDashboardRouter.get('/activity', async (req, res) => {
  const { days } = activitySchema.parse(req.query);
  const { rows } = await pool.query(
    `WITH days AS (
       SELECT generate_series(${today} - ($1::int - 1), ${today}, interval '1 day')::date AS day
     )
     SELECT to_char(d.day, 'YYYY-MM-DD') AS date,
            (SELECT count(*)::int FROM orders WHERE ${localDate('created_at')} = d.day) AS orders,
            (SELECT count(*)::int FROM users  WHERE ${localDate('created_at')} = d.day) AS signups,
            (SELECT count(*)::int FROM shops  WHERE ${localDate('created_at')} = d.day) AS shops
     FROM days d ORDER BY d.day`,
    [days],
  );
  res.json(rows);
});
