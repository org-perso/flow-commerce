import { useQuery } from '@tanstack/react-query';

import { useActiveShop } from '@/features/shop/use-shop';
import { apiFetch } from '@/lib/api-client';

/** One product's sales over the period; the CM gets quantities only. */
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
  totals: { quantity: number; revenue?: number; cost?: number; margin?: number };
};

/** Sales per product between two days (included), same rule as the dashboard. */
export function useProductSales(range: { from: string; to: string } | null) {
  const shopId = useActiveShop().id;
  return useQuery({
    queryKey: ['shops', shopId, 'reports', 'products', range],
    queryFn: () =>
      apiFetch<ProductSalesReport>(
        `/shops/${shopId}/reports/products?from=${range!.from}&to=${range!.to}`,
      ),
    enabled: range !== null,
  });
}
