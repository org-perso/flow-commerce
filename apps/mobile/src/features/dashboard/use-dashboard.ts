import { useQuery } from '@tanstack/react-query';

import { useActiveShop } from '@/features/shop/use-shop';

import { getDashboard, type DashboardPeriod } from './dashboard-api';

export function useDashboard(period: DashboardPeriod) {
  const shopId = useActiveShop().id;
  return useQuery({
    queryKey: ['shops', shopId, 'dashboard', period],
    queryFn: () => getDashboard(shopId, period),
  });
}
