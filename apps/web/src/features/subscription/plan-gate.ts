"use client";

import { useCan } from "@/features/shop/shop-context";
import { ApiError } from "@/lib/api-client";

import {
  useSubscription,
  type PaidPlan,
  type Subscription,
} from "./subscription";

/** What a plan limits (docs/subscription.md §2). */
export type Limit = "orders" | "members" | "drivers" | "shops";

/** The plan that lifts a limit, from the current one. */
export function requiredPlan(
  limit: Limit,
  current: Subscription["plan"],
): PaidPlan {
  if (limit === "orders") return "PRO";
  if (limit === "members") return current === "FREE" ? "PRO" : "BUSINESS";
  return "BUSINESS";
}

export type Gate = { locked: boolean; required: PaidPlan | null };

const OPEN: Gate = { locked: false, required: null };

/** Locked when the limits are on and the usage already reached the plan's maximum. */
export function gateOf(
  s: Subscription | undefined,
  limit: Exclude<Limit, "shops">,
): Gate {
  if (!s?.enforced) return OPEN;
  const max =
    limit === "orders"
      ? s.limits.ordersPerMonth
      : limit === "members"
        ? s.limits.members
        : s.limits.drivers;
  const used =
    limit === "orders"
      ? s.usage.ordersThisMonth
      : limit === "members"
        ? s.usage.members
        : s.usage.drivers;
  if (max === null || used < max) return OPEN;
  return { locked: true, required: requiredPlan(limit, s.plan) };
}

/**
 * Owner only (the subscription is theirs): what is locked before even trying. Other members
 * get the upgrade sheet from the API's refusal instead.
 */
export function usePlanGate(limit: Exclude<Limit, "shops">): Gate {
  const isOwner = useCan("shop.settings");
  const subscription = useSubscription(isOwner);
  return gateOf(subscription.data, limit);
}

/** The limit an API refusal is about (PLAN_LIMIT_REACHED), or null. */
export function planLimitOf(error: unknown): Limit | null {
  if (!(error instanceof ApiError) || error.body.code !== "PLAN_LIMIT_REACHED")
    return null;
  const limit = error.body.limit;
  return limit === "orders" ||
    limit === "members" ||
    limit === "drivers" ||
    limit === "shops"
    ? limit
    : null;
}
