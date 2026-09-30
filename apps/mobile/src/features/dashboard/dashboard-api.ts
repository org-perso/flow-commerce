import type { OrderStatus } from '@/components/ui';
import type { Order } from '@/features/order/order-api';
import { apiFetch } from '@/lib/api-client';

/** today, or rolling last 7 / 30 days (today included). */
export type DashboardPeriod = 'today' | '7d' | '30d';

export type Dashboard = {
  period: DashboardPeriod;
  /** CA: sum of sold lines, delivery fees excluded. */
  revenue: number;
  costOfGoodsSold: number;
  grossMargin: number;
  /** grossMargin / revenue, whole percent. */
  grossMarginRate: number;
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
  /** Live orders not paid yet (money to collect). */
  unpaid: { count: number; amount: number };
  /** Planned before today and still open, oldest first. */
  overdueOrders: Order[];
};

export function getDashboard(shopId: string, period: DashboardPeriod): Promise<Dashboard> {
  return apiFetch(`/shops/${shopId}/dashboard?period=${period}`);
}
