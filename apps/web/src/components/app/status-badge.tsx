import { Check } from "lucide-react";

import {
  STATUS_CLASSES,
  STATUS_LABELS,
  type OrderStatus,
} from "@/features/order/order-status";
import { cn } from "@/lib/utils";

export function StatusBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  const classes = STATUS_CLASSES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
        classes.badge,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", classes.dot)} />
      {STATUS_LABELS[status]}
    </span>
  );
}

export function PaymentBadge({
  isPaid,
  method,
}: {
  isPaid: boolean;
  method?: string | null;
}) {
  return isPaid ? (
    <span className="inline-flex items-center gap-1 rounded-md bg-success-soft px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-success">
      <Check className="size-3" />
      Payée{method ? ` · ${method}` : ""}
    </span>
  ) : (
    <span className="inline-flex items-center rounded-md border px-2 py-px text-xs font-semibold whitespace-nowrap text-muted-foreground">
      Non payée
    </span>
  );
}
