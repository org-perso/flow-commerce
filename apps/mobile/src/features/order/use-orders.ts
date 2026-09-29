import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { OrderStatus } from '@/components/ui';
import { useActiveShop } from '@/features/shop/use-shop';

import {
  changeOrderStatus,
  createOrder,
  getOrder,
  listOrders,
  type CreateOrderInput,
  type OrderFilters,
} from './order-api';

const ordersKey = (shopId: string) => ['shops', shopId, 'orders'] as const;

export function useOrders(filters: OrderFilters) {
  const shopId = useActiveShop().id;
  return useQuery({
    queryKey: [...ordersKey(shopId), 'list', filters],
    queryFn: () => listOrders(shopId, filters),
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

export function useChangeOrderStatus(orderId: string) {
  return useShopMutation((shopId, status: OrderStatus) =>
    changeOrderStatus(shopId, orderId, status),
  );
}
