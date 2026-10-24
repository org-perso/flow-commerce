import { Router } from 'express';
import { z } from 'zod';

import { pool, withTransaction } from '../../db/pool.js';
import { idParam, notFound } from '../../http/params.js';
import { ProblemError } from '../../http/problem.js';
import { optionalText, requiredText } from '../../http/schemas.js';
import { logAction } from './admin-audit.js';
import { currentAdmin } from './admin-session.js';

// F-24: Mobile Money payments declared by the owners, and plan changes by hand.

const listSchema = z.object({
  status: z.enum(['PENDING', 'VALIDATED', 'REJECTED']).optional(),
});

const columns = `p.id, p.plan, p.months, p.amount, p.operator, p.reference,
  p.payer_phone AS "payerPhone", p.status, p.reject_reason AS "rejectReason",
  p.created_at AS "createdAt", p.reviewed_at AS "reviewedAt",
  json_build_object('id', s.id, 'name', s.name, 'plan', s.plan, 'planEndsAt', s.plan_ends_at) AS shop`;

type PaymentRow = {
  id: string;
  shopId: string;
  shopName: string;
  plan: string;
  months: number;
  amount: number;
  status: string;
};

/** Payments the admin works on, locked (a payment is never validated twice). */
async function lockPayment(client: import('pg').PoolClient, id: string): Promise<PaymentRow> {
  const { rows } = await client.query<PaymentRow>(
    `SELECT p.id, p.shop_id AS "shopId", s.name AS "shopName", p.plan, p.months, p.amount,
            p.status
     FROM subscription_payments p JOIN shops s ON s.id = p.shop_id
     WHERE p.id = $1 FOR UPDATE OF p`,
    [id],
  );
  if (!rows[0]) throw notFound('Payment');
  if (rows[0].status !== 'PENDING') {
    throw new ProblemError(409, 'Conflict', 'Ce paiement a déjà été traité.');
  }
  return rows[0];
}

/**
 * Sets the plan for `months` more, counted from its current end when the shop already has
 * time left on a paid plan (RG-95), from now otherwise. months null: no end.
 */
async function extendPlan(
  client: import('pg').PoolClient,
  shopId: string,
  plan: string,
  months: number | null,
) {
  await client.query(
    `UPDATE shops SET plan = $2,
       plan_ends_at = CASE WHEN $3::int IS NULL THEN NULL
         ELSE GREATEST(now(), CASE WHEN plan <> 'FREE' THEN COALESCE(plan_ends_at, now())
                                   ELSE now() END)
              + make_interval(months => $3) END
     WHERE id = $1`,
    [shopId, plan, months],
  );
}

export const adminSubscriptionsRouter = Router();

adminSubscriptionsRouter.get('/payments', async (req, res) => {
  const { status } = listSchema.parse(req.query);
  const { rows } = await pool.query(
    `SELECT ${columns} FROM subscription_payments p JOIN shops s ON s.id = p.shop_id
     WHERE ($1::text IS NULL OR p.status = $1)
     ORDER BY (p.status = 'PENDING') DESC, p.created_at DESC
     LIMIT 200`,
    [status ?? null],
  );
  res.json(rows);
});

/** The money arrived: the plan runs for the paid months. */
adminSubscriptionsRouter.post('/payments/:paymentId/validate', async (req, res) => {
  const id = idParam(req.params.paymentId, 'Payment');
  const admin = currentAdmin(req);
  await withTransaction(async (client) => {
    const payment = await lockPayment(client, id);
    await client.query('SELECT 1 FROM shops WHERE id = $1 FOR UPDATE', [payment.shopId]);
    await extendPlan(client, payment.shopId, payment.plan, payment.months);
    await client.query(
      `UPDATE subscription_payments SET status = 'VALIDATED', reviewed_by = $2, reviewed_at = now()
       WHERE id = $1`,
      [id, admin.id],
    );
    await logAction(client, admin.id, {
      action: 'SUBSCRIPTION_VALIDATED',
      targetType: 'shop',
      targetId: payment.shopId,
      targetLabel: payment.shopName,
      details: `${payment.plan} · ${payment.months} mois · ${payment.amount} Ar`,
    });
  });
  res.status(204).end();
});

const rejectSchema = z.object({ reason: requiredText(500) }).strict();

/** Not received, wrong amount or reference: the provisional plan stops at once. */
adminSubscriptionsRouter.post('/payments/:paymentId/reject', async (req, res) => {
  const id = idParam(req.params.paymentId, 'Payment');
  const { reason } = rejectSchema.parse(req.body);
  const admin = currentAdmin(req);
  await withTransaction(async (client) => {
    const payment = await lockPayment(client, id);
    await client.query(
      `UPDATE subscription_payments
       SET status = 'REJECTED', reject_reason = $2, reviewed_by = $3, reviewed_at = now()
       WHERE id = $1`,
      [id, reason, admin.id],
    );
    await logAction(client, admin.id, {
      action: 'SUBSCRIPTION_REJECTED',
      targetType: 'shop',
      targetId: payment.shopId,
      targetLabel: payment.shopName,
      details: reason,
    });
  });
  res.status(204).end();
});

const planSchema = z
  .object({
    plan: z.enum(['FREE', 'PRO', 'BUSINESS']),
    /** Months to add (offered or extended); null: no end. Ignored for FREE. */
    months: z.number().int().min(1).max(36).nullable().default(null),
    details: optionalText(1000).optional(),
  })
  .strict();

/** Offer a period, extend, or change the plan by hand (pilots, partners). */
adminSubscriptionsRouter.post('/shops/:shopId/plan', async (req, res) => {
  const shopId = idParam(req.params.shopId, 'Shop');
  const body = planSchema.parse(req.body);
  const admin = currentAdmin(req);
  const shop = await withTransaction(async (client) => {
    const { rows } = await client.query<{ name: string }>(
      'SELECT name FROM shops WHERE id = $1 FOR UPDATE',
      [shopId],
    );
    if (!rows[0]) throw notFound('Shop');
    if (body.plan === 'FREE') {
      await client.query(`UPDATE shops SET plan = 'FREE', plan_ends_at = NULL WHERE id = $1`, [
        shopId,
      ]);
    } else {
      await extendPlan(client, shopId, body.plan, body.months);
    }
    await logAction(client, admin.id, {
      action: 'SHOP_PLAN_CHANGED',
      targetType: 'shop',
      targetId: shopId,
      targetLabel: rows[0].name,
      details: [
        body.plan,
        body.plan === 'FREE' ? null : body.months ? `+${body.months} mois` : 'sans fin',
        body.details,
      ]
        .filter(Boolean)
        .join(' · '),
    });
    const { rows: after } = await client.query(
      'SELECT id, name, plan, plan_ends_at AS "planEndsAt" FROM shops WHERE id = $1',
      [shopId],
    );
    return after[0];
  });
  res.json(shop);
});
