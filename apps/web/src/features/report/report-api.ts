"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useShopId } from "@/features/shop/shop-context";
import { apiFetch } from "@/lib/api-client";

/** One product's sales over the period; cost and margin only for roles that see costs. */
export type ProductSales = {
  productId: string;
  productName: string;
  quantity: number;
  /** Absent for the CM (quantities only). */
  revenue?: number;
  cost?: number;
  margin?: number;
};

export type ProductSalesReport = {
  from: string;
  to: string;
  products: ProductSales[];
  totals: {
    quantity: number;
    revenue?: number;
    cost?: number;
    margin?: number;
  };
};

/** Sales per product between two days (included), same rule as the dashboard. */
export function useProductSales(range: { from: string; to: string } | null) {
  const shopId = useShopId();
  return useQuery({
    queryKey: ["shop", shopId, "reports", "products", range],
    queryFn: () =>
      apiFetch<ProductSalesReport>(
        `/shops/${shopId}/reports/products?from=${range!.from}&to=${range!.to}`,
      ),
    enabled: range !== null,
    placeholderData: keepPreviousData,
  });
}
