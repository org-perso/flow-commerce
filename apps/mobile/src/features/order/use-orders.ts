import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { OrderStatus } from '@/components/ui';
import { useActiveShop } from '@/features/shop/use-shop';

import {
  changeOrderStatus,
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

export function useOrders(filters: OrderFilters) {
  const shopId = useActiveShop().id;
  return useQuery({
    queryKey: [...ordersKey(shopId), 'list', filters],
    queryFn: () => listOrders(shopId, filters),
  });
}

export function useOrderCounts(filters: Omit<OrderFilters, 'status'>) {
  const shopId = useActiveShop().id;
  return useQuery({
    queryKey: [...ordersKey(shopId), 'counts', filters],
    queryFn: () => getOrderCounts(shopId, filters),
  });
}

export function useOrder(orderId: string) {
  const shopId = useActiveShop().id;
  return useQuery({
    queryKey: [...ordersKey(shopId), 'detail', orderId],
    queryFn: () => getOrder(shopId, orderId),
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
