import { ApiError, apiErrorMessage } from "@/lib/api-client";
import { businessNow, businessToday } from "@/lib/format";

import type { Order } from "./order-api";
import { OPEN_STATUSES } from "./order-status";

/** Late: planned on a past day, or today with a slot already over (still open). */
export function isOverdue(
  order: Pick<Order, "status" | "scheduledDate" | "timeSlot">,
  today = businessToday(),
): boolean {
  if (!OPEN_STATUSES.includes(order.status)) return false;
  if (order.scheduledDate < today) return true;
  const end = order.timeSlot?.to;
  return order.scheduledDate === today && !!end && end <= businessNow();
}

/** Where the order goes: the delivery place, else "À récupérer". */
export function placeOf(order: Pick<Order, "delivery">): string {
  return order.delivery
    ? (order.delivery.place ?? order.delivery.address ?? "À livrer")
    : "À récupérer";
}

/** Number to call: the customer's, else the delivery one (walk-in customer). */
export function phoneOf(
  order: Pick<Order, "customer" | "delivery">,
): string | null {
  return order.customer?.phone ?? order.delivery?.phone ?? null;
}

export const customerName = (order: Pick<Order, "customer">) =>
  order.customer?.name ?? "Client sans fiche";

/** Stock errors name the product and what is left; anything else: the usual message. */
export function orderErrorMessage(
  error: unknown,
  productName?: (productId: string) => string | undefined,
): string {
  if (error instanceof ApiError && error.title === "Insufficient Stock") {
    const name =
      typeof error.body.productId === "string"
        ? productName?.(error.body.productId)
        : undefined;
    return `Stock insuffisant${name ? ` pour « ${name} »` : ""} : il en reste ${String(error.body.available)}.`;
  }
  return apiErrorMessage(error);
}
