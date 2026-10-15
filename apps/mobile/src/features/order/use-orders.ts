import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import type { OrderStatus } from '@/components/ui';
import { useActiveShop } from '@/features/shop/use-shop';
import { asList, usePagedList } from '@/lib/paging';

import {
  assignDriver,
  changeOrderStatus,
  claimDelivery,
  getDeliveriesToNotify,
  listDrivers,
  notifyDrivers,
  releaseDelivery,
  setDriverRoute,
  unassignDriver,
  createOrder,
  getOrder,
  getOrderCounts,
  listOrders,
  updateOrder,
  type CreateOrderInput,
  type OrderFilters,
  type OrderPatch,
} from './order-api';

const ordersKey = (shopId: string) => ['shops', shopId, 'orders'] as const;

/** Orders 30 by 30 (`items`, `loadMore`). */
export function useOrders(filters: OrderFilters) {
  const shopId = useActiveShop().id;
  return usePagedList({
    queryKey: [...ordersKey(shopId), 'list', filters],
    fetchPage: (page) => listOrders(shopId, filters, page),
    pageItems: asList,
  });
}

export function useOrderCounts(filters: Omit<OrderFilters, 'status'>) {
  const shopId = useActiveShop().id;
  return useQuery({
    queryKey: [...ordersKey(shopId), 'counts', filters],
    queryFn: () => getOrderCounts(shopId, filters),
  });
}

export function useOrder(orderId: string, enabled = true) {
  const shopId = useActiveShop().id;
  return useQuery({
    queryKey: [...ordersKey(shopId), 'detail', orderId],
    queryFn: () => getOrder(shopId, orderId),
    enabled,
  });
}

/** Orders move stock and may create customers: refresh all shop data afterwards. */
function useShopMutation<TVariables, TResult>(
  mutationFn: (shopId: string, variables: TVariables) => Promise<TResult>,
) {
  const shopId = useActiveShop().id;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: TVariables) => mutationFn(shopId, variables),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shops', shopId] }),
  });
}

export function useCreateOrder() {
  return useShopMutation((shopId, input: CreateOrderInput) => createOrder(shopId, input));
}

export function useUpdateOrder(orderId: string) {
  return useShopMutation((shopId, patch: OrderPatch) => updateOrder(shopId, orderId, patch));
}

export function useChangeOrderStatus(orderId: string) {
  return useShopMutation((shopId, status: OrderStatus) =>
    changeOrderStatus(shopId, orderId, status),
  );
}

export function useDrivers() {
  const shopId = useActiveShop().id;
  return useQuery({
    queryKey: ['shops', shopId, 'drivers'],
    queryFn: () => listDrivers(shopId),
  });
}

/** Picks a driver (userId), or removes the driver (null). */
export function useAssignDriver(orderId: string) {
  return useShopMutation((shopId, userId: string | null) =>
    userId ? assignDriver(shopId, orderId, userId) : unassignDriver(shopId, orderId),
  );
}

export function useClaimDelivery(orderId: string) {
  return useShopMutation((shopId, _: void) => claimDelivery(shopId, orderId));
}

export function useReleaseDelivery(orderId: string) {
  return useShopMutation((shopId, _: void) => releaseDelivery(shopId, orderId));
}

export function useDeliveriesToNotify(enabled: boolean) {
  const shopId = useActiveShop().id;
  return useQuery({
    queryKey: [...ordersKey(shopId), 'to-notify'],
    queryFn: () => getDeliveriesToNotify(shopId),
    enabled,
  });
}

export function useSetDriverRoute() {
  return useShopMutation((shopId, orderIds: string[]) => setDriverRoute(shopId, orderIds));
}

export function useNotifyDrivers() {
  return useShopMutation((shopId, _: void) => notifyDrivers(shopId));
}

/** Refetches when the screen is shown again, then every 30 s while it stays open. */
export function useLiveRefresh(refetch: () => unknown) {
  useFocusEffect(
    useCallback(() => {
      refetch();
      const timer = setInterval(refetch, 30_000);
      return () => clearInterval(timer);
    }, [refetch]),
  );
}

/** Driver lists refresh on their own (see useLiveRefresh). */
export function useDriverOrders(assignment: 'mine' | 'available') {
  const orders = useOrders({ assignment });
  useLiveRefresh(orders.refetch);
  return orders;
}

/**
 * Places of the last 200 orders, most used first ("Analakely", "Ivandry"…), to suggest while
 * typing: faster, and the same spelling keeps the driver's round grouped by place.
 */
export function useRecentPlaces() {
  const shopId = useActiveShop().id;
  return useQuery({
    queryKey: [...ordersKey(shopId), 'places'],
    queryFn: async () => {
      const orders = await listOrders(shopId, {}, { limit: 200, offset: 0 });
      const byKey = new Map<string, { label: string; count: number }>();
      for (const o of orders) {
        const label = o.delivery?.place?.trim();
        if (!label) continue;
        const key = placeSearchKey(label);
        const seen = byKey.get(key);
        byKey.set(key, { label: seen?.label ?? label, count: (seen?.count ?? 0) + 1 });
      }
      return [...byKey.values()].sort((a, b) => b.count - a.count).map((p) => p.label);
    },
    staleTime: 5 * 60_000,
  });
}

/** "Analakély " and "analakely" are the same place. */
export const placeSearchKey = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
