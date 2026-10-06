"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { useShopId } from "@/features/shop/shop-context";
import type { Page } from "@/lib/paging";

import {
  assignDriver,
  changeOrderStatus,
  createOrder,
  getDeliveriesToNotify,
  getOrder,
  getOrderCounts,
  listDrivers,
  listOrders,
  notifyDrivers,
  unassignDriver,
  updateOrder,
  type CreateOrderInput,
  type Order,
  type OrderFilters,
  type OrderPatch,
} from "./order-api";
import type { OrderStatus } from "./order-status";

const ordersKey = (shopId: string) => ["shop", shopId, "orders"] as const;

export function useOrders(filters: OrderFilters, page: Page, enabled = true) {
  const shopId = useShopId();
  return useQuery({
    queryKey: [...ordersKey(shopId), "list", filters, page],
    queryFn: () => listOrders(shopId, filters, page),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useOrderCounts(filters: Omit<OrderFilters, "status">) {
  const shopId = useShopId();
  return useQuery({
    queryKey: [...ordersKey(shopId), "counts", filters],
    queryFn: () => getOrderCounts(shopId, filters),
    placeholderData: keepPreviousData,
  });
}

export function useOrder(orderId: string | undefined) {
  const shopId = useShopId();
  return useQuery({
    queryKey: [...ordersKey(shopId), "detail", orderId],
    queryFn: () => getOrder(shopId, orderId!),
    enabled: !!orderId,
  });
}

/** After any change: refresh lists, counts, dashboard, stock (orders move the stock). */
export function useOrderChanged() {
  const queryClient = useQueryClient();
  const shopId = useShopId();
  return (order?: Order) => {
    if (order)
      queryClient.setQueryData(
        [...ordersKey(shopId), "detail", order.id],
        order,
      );
    void queryClient.invalidateQueries({ queryKey: ordersKey(shopId) });
    void queryClient.invalidateQueries({
      queryKey: ["shop", shopId, "dashboard"],
    });
    void queryClient.invalidateQueries({
      queryKey: ["shop", shopId, "products"],
    });
    void queryClient.invalidateQueries({
      queryKey: ["shop", shopId, "customers"],
    });
    void queryClient.invalidateQueries({
      queryKey: ["shop", shopId, "deliveries"],
    });
  };
}

export function useCreateOrder() {
  const shopId = useShopId();
  const changed = useOrderChanged();
  return useMutation({
    mutationFn: (input: CreateOrderInput) => createOrder(shopId, input),
    onSuccess: changed,
  });
}

export function useUpdateOrder(orderId: string) {
  const shopId = useShopId();
  const changed = useOrderChanged();
  return useMutation({
    mutationFn: (patch: OrderPatch) => updateOrder(shopId, orderId, patch),
    onSuccess: changed,
  });
}

export function useChangeOrderStatus(orderId: string) {
  const shopId = useShopId();
  const changed = useOrderChanged();
  return useMutation({
    mutationFn: (status: OrderStatus) =>
      changeOrderStatus(shopId, orderId, status),
    onSuccess: changed,
  });
}

export function useDrivers(enabled = true) {
  const shopId = useShopId();
  return useQuery({
    queryKey: ["shop", shopId, "drivers"],
    queryFn: () => listDrivers(shopId),
    enabled,
  });
}

export function useAssignDriver(orderId: string) {
  const shopId = useShopId();
  const changed = useOrderChanged();
  return useMutation({
    mutationFn: (userId: string | null) =>
      userId
        ? assignDriver(shopId, orderId, userId)
        : unassignDriver(shopId, orderId),
    onSuccess: changed,
  });
}

export function useDeliveriesToNotify(enabled = true) {
  const shopId = useShopId();
  return useQuery({
    queryKey: ["shop", shopId, "deliveries", "to-notify"],
    queryFn: () => getDeliveriesToNotify(shopId),
    enabled,
  });
}

export function useNotifyDrivers() {
  const shopId = useShopId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notifyDrivers(shopId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["shop", shopId, "deliveries"],
      }),
  });
}

/**
 * Places of the last 200 orders, most used first, suggested while typing the place: faster,
 * and the same spelling keeps the driver's round grouped by place (same as the mobile app).
 */
export function useRecentPlaces() {
  const shopId = useShopId();
  return useQuery({
    queryKey: [...ordersKey(shopId), "places"],
    queryFn: async () => {
      const orders = await listOrders(shopId, {}, { limit: 200, offset: 0 });
      const byKey = new Map<string, { label: string; count: number }>();
      for (const o of orders) {
        const label = o.delivery?.place?.trim();
        if (!label) continue;
        const key = label
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/\s+/g, " ");
        const seen = byKey.get(key);
        byKey.set(key, {
          label: seen?.label ?? label,
          count: (seen?.count ?? 0) + 1,
        });
      }
      return [...byKey.values()]
        .sort((a, b) => b.count - a.count)
        .map((p) => p.label);
    },
    staleTime: 5 * 60_000,
  });
}
