"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useShopId } from "@/features/shop/shop-context";

import { getDashboard, type DashboardPeriod } from "./dashboard-api";

export function useDashboard(period: DashboardPeriod, enabled = true) {
  const shopId = useShopId();
  return useQuery({
    queryKey: ["shop", shopId, "dashboard", period],
    queryFn: () => getDashboard(shopId, period),
    placeholderData: keepPreviousData,
    enabled,
  });
}
