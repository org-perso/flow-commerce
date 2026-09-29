import type { OrderStatus } from '@/components/ui';
import type { Order } from '@/features/order/order-api';
import { apiFetch } from '@/lib/api-client';

export type DashboardPeriod = 'today' | 'week' | 'month';

export type Dashboard = {
  period: DashboardPeriod;
  /** CA: sum of sold lines, delivery fees excluded. */
  revenue: number;
  costOfGoodsSold: number;
  grossMargin: number;
  /** Expenses of the period, "Achat de produits" excluded. */
  expenses: number;
  productPurchases: number;
  estimatedProfit: number;
  salesCount: number;
  /** Current number of orders per status, all dates. */
  ordersByStatus: Partial<Record<OrderStatus, number>>;
  lowStockProducts: {
    id: string;
    name: string;
    stockQuantity: number;
    lowStockThreshold: number;
  }[];
  recentOrders: Order[];
};

export function getDashboard(shopId: string, period: DashboardPeriod): Promise<Dashboard> {
  return apiFetch(`/shops/${shopId}/dashboard?period=${period}`);
}
