import { router } from 'expo-router';
import { useState } from 'react';

import { AlertBanner } from '@/components/ui';
import { useCan } from '@/features/shop/use-shop';

import { PLAN_LABELS, useSubscription } from './subscription';

const DAY = 86_400_000;

/**
 * Owner only, limits on: the most urgent of grace days, end within 7 days, 80 % of the
 * monthly orders. A tap opens the subscription on the right plan.
 */
export function PlanBanner() {
  const isOwner = useCan('shop.settings');
  const s = useSubscription(isOwner).data;
  // Read once: whole days are enough for the end-of-plan reminder.
  const [now] = useState(() => Date.now());
  if (!s?.enforced) return null;
  const open = (plan?: string) =>
    router.push(plan ? { pathname: '/subscription', params: { formule: plan } } : '/subscription');

  if (s.inGrace) {
    return (
      <AlertBanner
        tone="danger"
        message={`Abonnement ${PLAN_LABELS[s.paidPlan]} terminé : encore ${s.graceDays} jours avant le retour en Gratuit. Renouveler ›`}
        onPress={() => open(s.paidPlan)}
      />
    );
  }
  if (s.plan !== 'FREE' && s.endsAt && !s.pendingPlan) {
    const days = Math.ceil((Date.parse(s.endsAt) - now) / DAY);
    if (days <= 7) {
      return (
        <AlertBanner
          message={`Votre abonnement ${PLAN_LABELS[s.plan]} se termine dans ${days} jour${days > 1 ? 's' : ''}. Renouveler ›`}
          onPress={() => open(s.plan)}
        />
      );
    }
  }
  const max = s.limits.ordersPerMonth;
  if (max !== null && s.usage.ordersThisMonth >= max * 0.8) {
    const left = Math.max(0, max - s.usage.ordersThisMonth);
    return (
      <AlertBanner
        message={
          left === 0
            ? 'Limite de commandes du mois atteinte. Passer à Pro ›'
            : `Plus que ${left} commande${left > 1 ? 's' : ''} ce mois-ci. Passer à Pro ›`
        }
        onPress={() => open('PRO')}
      />
    );
  }
  return null;
}
