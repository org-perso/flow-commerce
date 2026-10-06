import { Check } from "lucide-react";

import { STATUS_LABELS, type OrderStatus } from "@/features/order/order-status";
import { colorVars, useStateColorKey } from "@/features/shop/state-colors";
import { cn } from "@/lib/utils";

/** In the shop's colors (Paramètres › Couleurs des états), else the defaults. */
export function StatusBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  const color = useStateColorKey(status);
  return (
    <span
      style={colorVars(color)}
      className={cn(
        "state-badge inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
        className,
      )}
    >
      <span className="state-dot size-1.5 rounded-full" />
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
  const color = useStateColorKey(isPaid ? "PAID" : "UNPAID");
  return (
    <span
      style={colorVars(color)}
      className="state-badge inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap"
    >
      {isPaid && <Check className="size-3" />}
      {isPaid ? `Payée${method ? ` · ${method}` : ""}` : "Non payée"}
    </span>
  );
}
