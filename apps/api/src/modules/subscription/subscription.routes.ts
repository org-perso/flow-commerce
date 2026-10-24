import { Router } from 'express';
import { z } from 'zod';

import { env } from '../../config/env.js';
import { pool } from '../../db/pool.js';
import { currentShopId, currentUser } from '../../http/context.js';
import { ProblemError } from '../../http/problem.js';
import { phoneField } from '../customer/phone.js';
import {
  DURATIONS,
  GRACE_DAYS,
  PLANS,
  paymentReference,
  priceFor,
  shopPlan,
  shopUsage,
  type Months,
} from './plans.js';

export const OPERATORS = ['MVOLA', 'ORANGE_MONEY', 'AIRTEL_MONEY'] as const;

const paymentColumns = `id, plan, months, amount, operator, reference, payer_phone AS "payerPhone",
  status, reject_reason AS "rejectReason", created_at AS "createdAt", reviewed_at AS "reviewedAt"`;

const declareSchema = z
  .object({
    plan: z.enum(['PRO', 'BUSINESS']),
    months: z.union([z.literal(1), z.literal(3), z.literal(12)]),
    operator: z.enum(OPERATORS),
    /** Transaction reference from the operator's SMS. */
    reference: z
      .string()
      .trim()
      .min(4, 'Référence trop courte.')
      .max(50)
      .transform((v) => v.toUpperCase()),
    payerPhone: phoneField.default(null),
  })
  .strict();

/** /shops/:shopId/subscription — the owner's plan, usage and payments (RG-96). */
export const subscriptionRouter = Router();

subscriptionRouter.get('/', async (req, res) => {
  const shopId = currentShopId(req);
  const [plan, usage, payments] = await Promise.all([
    shopPlan(shopId),
    shopUsage(shopId),
    pool.query(
      `SELECT ${paymentColumns} FROM subscription_payments
       WHERE shop_id = $1 ORDER BY created_at DESC LIMIT 24`,
      [shopId],
    ),
  ]);
  res.json({
    ...plan,
    graceDays: GRACE_DAYS,
    /** false: limits not applied yet (launch offer), everything is allowed. */
    enforced: env.SUBSCRIPTIONS_ENFORCED,
    limits: PLANS[plan.plan],
    usage,
    plans: PLANS,
    durations: DURATIONS,
    prices: Object.fromEntries(
      (['PRO', 'BUSINESS'] as const).map((p) => [
        p,
        Object.fromEntries(DURATIONS.map((m) => [m, priceFor(p, m)])),
      ]),
    ),
    paymentReference: paymentReference(shopId),
    payTo: {
      MVOLA: env.PAYMENT_NUMBER_MVOLA ?? null,
      ORANGE_MONEY: env.PAYMENT_NUMBER_ORANGE_MONEY ?? null,
      AIRTEL_MONEY: env.PAYMENT_NUMBER_AIRTEL_MONEY ?? null,
    },
    payments: payments.rows,
  });
});

/**
 * The owner declares a Mobile Money payment; the plan applies at once for PROVISIONAL_DAYS,
 * until an admin validates it (or refuses it).
 */
subscriptionRouter.post('/payments', async (req, res) => {
  const shopId = currentShopId(req);
  const body = declareSchema.parse(req.body);
  const { rows: pending } = await pool.query(
    `SELECT 1 FROM subscription_payments WHERE shop_id = $1 AND status = 'PENDING'`,
    [shopId],
  );
  if (pending.length > 0) {
    throw new ProblemError(
      409,
      'Conflict',
      'Un paiement est déjà en attente de validation pour cette boutique.',
      { code: 'PAYMENT_PENDING' },
    );
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO subscription_payments
         (shop_id, plan, months, amount, operator, reference, payer_phone, declared_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING ${paymentColumns}`,
      [
        shopId,
        body.plan,
        body.months,
        priceFor(body.plan, body.months as Months),
        body.operator,
        body.reference,
        body.payerPhone,
        currentUser(req).id,
      ],
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    if ((error as { code?: string }).code === '23505') {
      throw new ProblemError(409, 'Conflict', 'Cette référence de paiement a déjà été utilisée.', {
        code: 'PAYMENT_REFERENCE_USED',
      });
    }
    throw error;
  }
});
