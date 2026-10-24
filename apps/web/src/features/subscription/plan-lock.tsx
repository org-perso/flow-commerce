import { Crown } from "lucide-react";

import { cn } from "@/lib/utils";

import { PLAN_LABELS, type PaidPlan } from "./subscription";

/** Gold crown with the plan that includes it: marks what the current plan does not. */
export function PlanLock({
  plan,
  className,
}: {
  plan: PaidPlan;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-gold-soft px-2 py-0.5 text-[11px] font-semibold text-gold-ink",
        className,
      )}
      title={`Inclus dans ${PLAN_LABELS[plan]}`}
    >
      <Crown className="size-3" /> {PLAN_LABELS[plan]}
    </span>
  );
}
