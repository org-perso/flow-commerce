import { Router } from 'express';
import { z } from 'zod';

import { BUSINESS_TZ } from '../../config/time.js';
import { pool } from '../../db/pool.js';
import { currentShopId } from '../../http/context.js';
import { STOCK_TAKEN_STATUSES } from '../order/order-status.js';
import { listOrders } from '../order/order.repository.js';

const PERIOD_UNITS = { today: 'day', week: 'week', month: 'month' } as const;
const query = z.object({ period: z.enum(['today', 'week', 'month']).default('today') });

/*
 * Business rules (see CLAUDE.md):
 * - Sales = orders holding stock (confirmed → delivered), by creation date in Indian/Antananarivo.
 * - Revenue (CA) = sum of item subtotals. Delivery fees are NOT revenue.
 * - Cost of goods sold = sum of quantity × frozen unit purchase price.
 * - Expenses exclude ACHAT_PRODUITS: that cost is already counted in cost of goods sold.
 * - Estimated profit = revenue − cost of goods sold − expenses.
 */

/** /shops/:shopId/dashboard?period=today|week|month */
export const dashboardRouter = Router();

dashboardRouter.get('/', async (req, res) => {
  const shopId = currentShopId(req);
  const { period } = query.parse(req.query);
  const unit = PERIOD_UNITS[period];

  // Period start/end as timestamptz, and as dates for expenses (weeks start on Monday).
  const bounds = `
    WITH b AS (
      SELECT date_trunc('${unit}', now() AT TIME ZONE '${BUSINESS_TZ}') AS start_local
    )
    SELECT start_local AT TIME ZONE '${BUSINESS_TZ}' AS start_at,
           (start_local + interval '1 ${unit}') AT TIME ZONE '${BUSINESS_TZ}' AS end_at,
           start_local::date AS start_date,
           (start_local + interval '1 ${unit}')::date AS end_date
    FROM b`;

  const [sales, expenses, counts, lowStock] = await Promise.all([
    pool.query<{ revenue: number; costOfGoodsSold: number; orderCount: number }>(
      `WITH p AS (${bounds})
       SELECT COALESCE(sum(i.subtotal), 0)::bigint AS revenue,
              COALESCE(sum(i.quantity * i.unit_purchase_price), 0)::bigint AS "costOfGoodsSold",
              count(DISTINCT o.id)::int AS "orderCount"
       FROM p, orders o JOIN order_items i ON i.order_id = o.id
       WHERE o.shop_id = $1 AND o.status = ANY($2)
         AND o.created_at >= p.start_at AND o.created_at < p.end_at`,
      [shopId, STOCK_TAKEN_STATUSES],
    ),
    pool.query<{ expenses: number; productPurchases: number }>(
      `WITH p AS (${bounds})
       SELECT COALESCE(sum(amount) FILTER (WHERE category <> 'ACHAT_PRODUITS'), 0)::bigint AS expenses,
              COALESCE(sum(amount) FILTER (WHERE category = 'ACHAT_PRODUITS'), 0)::bigint AS "productPurchases"
       FROM p, expenses e
       WHERE e.shop_id = $1 AND e.date >= p.start_date AND e.date < p.end_date`,
      [shopId],
    ),
    // Current workload, all dates: what the seller has to handle now.
    pool.query<{ status: string; count: number }>(
      `SELECT status, count(*)::int AS count FROM orders WHERE shop_id = $1 GROUP BY status`,
      [shopId],
    ),
    pool.query<{ id: string; name: string; stockQuantity: number; lowStockThreshold: number }>(
      `SELECT id, name, stock_quantity AS "stockQuantity", low_stock_threshold AS "lowStockThreshold"
       FROM products
       WHERE shop_id = $1 AND archived_at IS NULL AND stock_quantity <= low_stock_threshold
       ORDER BY stock_quantity, name`,
      [shopId],
    ),
  ]);

  const { revenue, costOfGoodsSold, orderCount } = sales.rows[0]!;
  const { expenses: expenseTotal, productPurchases } = expenses.rows[0]!;
  const ordersByStatus = Object.fromEntries(counts.rows.map((r) => [r.status, r.count]));

  res.json({
    period,
    revenue,
    costOfGoodsSold,
    grossMargin: revenue - costOfGoodsSold,
    expenses: expenseTotal,
    productPurchases,
    estimatedProfit: revenue - costOfGoodsSold - expenseTotal,
    salesCount: orderCount,
    ordersByStatus,
    lowStockProducts: lowStock.rows,
    recentOrders: await listOrders(shopId, { limit: 5, offset: 0 }),
  });
});
