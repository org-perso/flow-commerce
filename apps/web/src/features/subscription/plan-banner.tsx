"use client";

import { Clock, Crown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { InlineAlert } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { useCan, useShopId } from "@/features/shop/shop-context";

import { PLAN_LABELS, useSubscription } from "./subscription";

const DAY = 86_400_000;

/**
 * Owner only, limits on: one banner at a time, the most urgent first — grace days, end within
 * 7 days, 80 % of the monthly orders.
 */
export function PlanBanner() {
  // Read once: whole days are enough for the end-of-plan reminder.
  const [now] = useState(() => Date.now());
  const isOwner = useCan("shop.settings");
  const shopId = useShopId();
  const s = useSubscription(isOwner).data;
  if (!s?.enforced) return null;
  const href = `/s/${shopId}/abonnement`;

  const action = (label: string, plan?: string) => (
    <Button size="sm" variant="gold" asChild>
      <Link href={plan ? `${href}?formule=${plan}` : href}>
        <Crown /> {label}
      </Link>
    </Button>
  );

  if (s.inGrace) {
    return (
      <InlineAlert
        tone="danger"
        icon={Clock}
        action={action("Renouveler", s.paidPlan)}
      >
        Votre abonnement {PLAN_LABELS[s.paidPlan]} est terminé : encore{" "}
        {s.graceDays} jours avant le retour en Gratuit.
      </InlineAlert>
    );
  }
  if (s.plan !== "FREE" && s.endsAt && !s.pendingPlan) {
    const days = Math.ceil((Date.parse(s.endsAt) - now) / DAY);
    if (days <= 7) {
      return (
        <InlineAlert icon={Clock} action={action("Renouveler", s.plan)}>
          Votre abonnement {PLAN_LABELS[s.plan]} se termine dans {days} jour
          {days > 1 ? "s" : ""}.
        </InlineAlert>
      );
    }
  }
  const max = s.limits.ordersPerMonth;
  if (max !== null && s.usage.ordersThisMonth >= max * 0.8) {
    const left = Math.max(0, max - s.usage.ordersThisMonth);
    return (
      <InlineAlert icon={Crown} action={action("Passer à Pro", "PRO")}>
        {left === 0
          ? "Limite de commandes du mois atteinte."
          : `Plus que ${left} commande${left > 1 ? "s" : ""} ce mois-ci avec la formule Gratuit.`}
      </InlineAlert>
    );
  }
  return null;
}
