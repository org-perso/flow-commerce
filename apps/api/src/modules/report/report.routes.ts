import { Router } from 'express';
import { z } from 'zod';

import { BUSINESS_TZ, businessToday } from '../../config/time.js';
import { pool } from '../../db/pool.js';
import { currentMember, currentShopId } from '../../http/context.js';
import { ProblemError } from '../../http/problem.js';
import { isoDate } from '../../http/schemas.js';
import { STOCK_TAKEN_STATUSES } from '../order/order-status.js';
import { can } from '../shop/permissions.js';

/** Bounds included; by default the current month. */
const query = z.object({ from: isoDate.optional(), to: isoDate.optional() });

type ProductSales = {
  productId: string;
  productName: string;
  quantity: number;
  /** Only for roles that see the figures (dashboard): not the CM. */
  revenue?: number;
  /** Only for roles that see costs (RG-60). */
  cost?: number;
  margin?: number;
};

/** /shops/:shopId/reports — owner, manager and CM (quantities only for the CM). */
export const reportsRouter = Router();

/**
 * Sales per product between two days (Madagascar time), with the dashboard's rule: orders
 * confirmed or further, not cancelled nor returned, counted on their creation day. Prices are
 * the ones frozen on the order lines.
 */
reportsRouter.get('/products', async (req, res) => {
  const today = businessToday();
  const { from = `${today.slice(0, 7)}-01`, to = today } = query.parse(req.query);
  if (from > to) {
    throw new ProblemError(422, 'Unprocessable Content', '"from" must be on or before "to".');
  }

  const { rows } = await pool.query<Required<ProductSales>>(
    `SELECT i.product_id AS "productId", p.name AS "productName",
            sum(i.quantity)::int AS quantity,
            sum(i.subtotal)::bigint AS revenue,
            sum(i.quantity * i.unit_purchase_price)::bigint AS cost
     FROM orders o
     JOIN order_items i ON i.order_id = o.id
     JOIN products p ON p.id = i.product_id
     WHERE o.shop_id = $1 AND o.status = ANY($2)
       AND o.created_at >= $3::date::timestamp AT TIME ZONE '${BUSINESS_TZ}'
       AND o.created_at < ($4::date + 1)::timestamp AT TIME ZONE '${BUSINESS_TZ}'
     GROUP BY i.product_id, p.name
     ORDER BY quantity DESC, revenue DESC, p.name`,
    [currentShopId(req), STOCK_TAKEN_STATUSES, from, to],
  );

  // The CM sees quantities only: no revenue, no costs (owner and manager see everything).
  const role = currentMember(req).role;
  const seesRevenue = can(role, 'dashboard');
  const seesCosts = can(role, 'costs');
  // BIGINT sums come back as numbers (see db/pool.ts).
  const products: ProductSales[] = rows.map(({ cost, revenue, ...sales }) => ({
    ...sales,
    ...(seesRevenue ? { revenue } : {}),
    ...(seesCosts ? { cost, margin: revenue - cost } : {}),
  }));
  const sum = (key: 'quantity' | 'revenue' | 'cost' | 'margin') =>
    products.reduce((total, p) => total + (p[key] ?? 0), 0);

  res.json({
    from,
    to,
    products,
    totals: {
      quantity: sum('quantity'),
      ...(seesRevenue ? { revenue: sum('revenue') } : {}),
      ...(seesCosts ? { cost: sum('cost'), margin: sum('margin') } : {}),
    },
  });
});
