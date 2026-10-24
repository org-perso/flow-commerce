import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useActiveShop } from '@/features/shop/use-shop';
import { apiFetch } from '@/lib/api-client';

// Subscription of the shop (docs/subscription.md): owner only.

export type Plan = 'FREE' | 'PRO' | 'BUSINESS';
export type PaidPlan = Exclude<Plan, 'FREE'>;
export type Months = 1 | 3 | 12;
export type Operator = 'MVOLA' | 'ORANGE_MONEY' | 'AIRTEL_MONEY';

export type PlanLimits = {
  price: number;
  shops: number;
  ordersPerMonth: number | null;
  members: number | null;
  drivers: number | null;
};

export type Payment = {
  id: string;
  plan: PaidPlan;
  months: Months;
  amount: number;
  operator: Operator;
  reference: string;
  payerPhone: string | null;
  status: 'PENDING' | 'VALIDATED' | 'REJECTED';
  rejectReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export type Subscription = {
  plan: Plan;
  paidPlan: Plan;
  endsAt: string | null;
  inGrace: boolean;
  pendingPlan: PaidPlan | null;
  graceDays: number;
  enforced: boolean;
  limits: PlanLimits;
  usage: { ordersThisMonth: number; members: number; drivers: number };
  plans: Record<Plan, PlanLimits>;
  durations: Months[];
  prices: Record<PaidPlan, Record<Months, number>>;
  paymentReference: string;
  payTo: Record<Operator, string | null>;
  payments: Payment[];
};

export const PLAN_LABELS: Record<Plan, string> = {
  FREE: 'Gratuit',
  PRO: 'Pro',
  BUSINESS: 'Business',
};

export const OPERATOR_LABELS: Record<Operator, string> = {
  MVOLA: 'MVola',
  ORANGE_MONEY: 'Orange Money',
  AIRTEL_MONEY: 'Airtel Money',
};

export const PAYMENT_STATUS_LABELS: Record<Payment['status'], string> = {
  PENDING: 'En attente de validation',
  VALIDATED: 'Validé',
  REJECTED: 'Refusé',
};

const key = (shopId: string) => ['shop', shopId, 'subscription'] as const;

export function useSubscription(enabled = true) {
  const shopId = useActiveShop().id;
  return useQuery({
    enabled,
    queryKey: key(shopId),
    queryFn: () => apiFetch<Subscription>(`/shops/${shopId}/subscription`),
  });
}

export type PaymentInput = {
  plan: PaidPlan;
  months: Months;
  operator: Operator;
  reference: string;
  payerPhone: string | null;
};

export function useDeclarePayment() {
  const shopId = useActiveShop().id;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PaymentInput) =>
      apiFetch<Payment>(`/shops/${shopId}/subscription/payments`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key(shopId) }),
  });
}

/** 'Illimité' for null, the number otherwise. */
export const limitText = (value: number | null, unit: string) =>
  value === null ? `${unit} illimités` : `${value} ${unit}`;

/** 'Pro · jusqu’au 24 nov. 2026', 'Gratuit · 38 / 50 commandes ce mois-ci'… */
export function planSummary(s: Subscription): string {
  if (s.pendingPlan) return `${PLAN_LABELS[s.pendingPlan]} · paiement en attente`;
  if (s.plan !== 'FREE' && s.endsAt) {
    const date = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Indian/Antananarivo',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(s.endsAt));
    return `${PLAN_LABELS[s.plan]} · ${s.inGrace ? 'terminé le' : 'jusqu’au'} ${date}`;
  }
  if (s.plan !== 'FREE') return PLAN_LABELS[s.plan];
  if (!s.enforced) return 'Gratuit · offre de lancement';
  return `Gratuit · ${s.usage.ordersThisMonth} / ${s.limits.ordersPerMonth} commandes ce mois-ci`;
}
