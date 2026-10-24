import { createHash } from 'node:crypto';

import { env } from '../../config/env.js';
import { pool, type Db } from '../../db/pool.js';
import { ProblemError } from '../../http/problem.js';

// Plans and limits (docs/subscription.md §2, §8). Prices in Ariary per month; null = no limit.

export const PLANS = {
  FREE: { price: 0, shops: 1, ordersPerMonth: 50, members: 0, drivers: 0 },
  PRO: { price: 20_000, shops: 1, ordersPerMonth: null, members: 1, drivers: 0 },
  BUSINESS: { price: 30_000, shops: 3, ordersPerMonth: null, members: null, drivers: null },
} as const;

export type Plan = keyof typeof PLANS;
export type PaidPlan = Exclude<Plan, 'FREE'>;
export type Limit = 'orders' | 'members' | 'drivers' | 'shops';

const RANK: Record<Plan, number> = { FREE: 0, PRO: 1, BUSINESS: 2 };

/** Days a paid plan keeps working after its end, and a declared payment before validation. */
export const GRACE_DAYS = 3;
export const PROVISIONAL_DAYS = 3;

export const DURATIONS = [1, 3, 12] as const;
export type Months = (typeof DURATIONS)[number];

/** 12 months for the price of 10. */
export const priceFor = (plan: PaidPlan, months: Months) =>
  PLANS[plan].price * (months === 12 ? 10 : months);

/** Short code the owner puts as the payment's reason, to find it: "FC-7K2M9Q". */
export function paymentReference(shopId: string): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = createHash('sha256').update(shopId).digest();
  return `FC-${Array.from(bytes.subarray(0, 6), (b) => alphabet[b % alphabet.length]).join('')}`;
}

export type ShopPlan = {
  /** What the shop can use now. */
  plan: Plan;
  /** Paid plan stored on the shop and its end (null: no end). */
  paidPlan: Plan;
  endsAt: Date | null;
  /** The paid plan is past its end, within the grace days. */
  inGrace: boolean;
  /** Plan of a payment declared and not validated yet (used provisionally for 3 days). */
  pendingPlan: PaidPlan | null;
};

/**
 * Effective plan, computed on each read (no daily job): the paid plan until its end plus the
 * grace days, raised by a payment declared less than PROVISIONAL_DAYS ago.
 */
export async function shopPlan(shopId: string, db: Db = pool): Promise<ShopPlan> {
  const { rows } = await db.query<{
    paidPlan: Plan;
    endsAt: Date | null;
    active: boolean;
    inGrace: boolean;
    pendingPlan: PaidPlan | null;
  }>(
    `SELECT s.plan AS "paidPlan", s.plan_ends_at AS "endsAt",
            s.plan <> 'FREE' AND (s.plan_ends_at IS NULL
              OR s.plan_ends_at + make_interval(days => $2) > now()) AS active,
            s.plan <> 'FREE' AND s.plan_ends_at < now()
              AND s.plan_ends_at + make_interval(days => $2) > now() AS "inGrace",
            (SELECT p.plan FROM subscription_payments p
             WHERE p.shop_id = s.id AND p.status = 'PENDING'
               AND p.created_at > now() - make_interval(days => $3)
             ORDER BY p.created_at DESC LIMIT 1) AS "pendingPlan"
     FROM shops s WHERE s.id = $1`,
    [shopId, GRACE_DAYS, PROVISIONAL_DAYS],
  );
  const row = rows[0];
  if (!row) throw new ProblemError(404, 'Not Found', 'Shop not found.');
  const paid: Plan = row.active ? row.paidPlan : 'FREE';
  const plan = row.pendingPlan && RANK[row.pendingPlan] > RANK[paid] ? row.pendingPlan : paid;
  return {
    plan,
    paidPlan: row.paidPlan,
    endsAt: row.endsAt,
    inGrace: row.inGrace,
    pendingPlan: row.pendingPlan,
  };
}

export type Usage = { ordersThisMonth: number; members: number; drivers: number };

/** What counts against the limits: orders created this month (Madagascar), team members. */
export async function shopUsage(shopId: string, db: Db = pool): Promise<Usage> {
  const { rows } = await db.query<Usage>(
    `SELECT
       (SELECT count(*)::int FROM orders
        WHERE shop_id = $1
          AND created_at >= date_trunc('month', now() AT TIME ZONE 'Indian/Antananarivo')
                            AT TIME ZONE 'Indian/Antananarivo') AS "ordersThisMonth",
       (SELECT count(*)::int FROM shop_members
        WHERE shop_id = $1 AND role IN ('MANAGER', 'CM')) AS members,
       (SELECT count(*)::int FROM shop_members
        WHERE shop_id = $1 AND role = 'DRIVER') AS drivers`,
    [shopId],
  );
  return rows[0]!;
}

const LIMIT_MESSAGES: Record<Limit, string> = {
  orders: 'Limite de commandes du mois atteinte pour la formule Gratuit. Passez à Pro.',
  members: 'Votre formule ne permet pas d’ajouter un membre de plus à l’équipe.',
  drivers: 'Les livreurs sont inclus dans la formule Business.',
  shops: 'Votre formule ne permet pas de créer une boutique de plus.',
};

export function limitReached(limit: Limit, plan: Plan, max: number) {
  return new ProblemError(403, 'Plan Limit Reached', LIMIT_MESSAGES[limit], {
    code: 'PLAN_LIMIT_REACHED',
    limit,
    plan,
    max,
  });
}

/** RG-91: checked by the API before creating; nothing when the limits are switched off. */
export async function assertWithinLimit(
  shopId: string,
  limit: Exclude<Limit, 'shops'>,
  db: Db = pool,
): Promise<void> {
  if (!env.SUBSCRIPTIONS_ENFORCED) return;
  const { plan } = await shopPlan(shopId, db);
  const usage = await shopUsage(shopId, db);
  const rules = PLANS[plan];
  const [max, used] =
    limit === 'orders'
      ? [rules.ordersPerMonth, usage.ordersThisMonth]
      : limit === 'members'
        ? [rules.members, usage.members]
        : [rules.drivers, usage.drivers];
  if (max !== null && used >= max) throw limitReached(limit, plan, max);
}

/** A new shop: allowed by the best plan among the shops the user owns. */
export async function assertCanCreateShop(userId: string, db: Db = pool): Promise<void> {
  if (!env.SUBSCRIPTIONS_ENFORCED) return;
  const { rows } = await db.query<{ id: string }>(
    `SELECT s.id FROM shops s JOIN shop_members m ON m.shop_id = s.id
     WHERE m.user_id = $1 AND m.role = 'OWNER'`,
    [userId],
  );
  if (rows.length === 0) return;
  let best: Plan = 'FREE';
  for (const { id } of rows) {
    const { plan } = await shopPlan(id, db);
    if (RANK[plan] > RANK[best]) best = plan;
  }
  const max = PLANS[best].shops;
  if (rows.length >= max) throw limitReached('shops', best, max);
}
