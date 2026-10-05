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
  createCustomer,
  deleteCustomer,
  getCustomer,
  getUnlinkedOrdersCount,
  listCustomers,
  updateCustomer,
  type CustomerInput,
} from "./customer-api";

const customersKey = (shopId: string) => ["shop", shopId, "customers"] as const;

export function useCustomers(q: string, page?: Page, enabled = true) {
  const shopId = useShopId();
  return useQuery({
    queryKey: [...customersKey(shopId), "list", q, page],
    queryFn: () => listCustomers(shopId, q || undefined, page),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useCustomer(customerId: string | undefined) {
  const shopId = useShopId();
  return useQuery({
    queryKey: [...customersKey(shopId), "detail", customerId],
    queryFn: () => getCustomer(shopId, customerId!),
    enabled: !!customerId,
  });
}

export function useUnlinkedOrdersCount() {
  const shopId = useShopId();
  return useQuery({
    queryKey: [...customersKey(shopId), "unlinked"],
    queryFn: () => getUnlinkedOrdersCount(shopId),
  });
}

function useCustomersChanged() {
  const queryClient = useQueryClient();
  const shopId = useShopId();
  return () =>
    queryClient.invalidateQueries({ queryKey: customersKey(shopId) });
}

export function useCreateCustomer() {
  const shopId = useShopId();
  const changed = useCustomersChanged();
  return useMutation({
    mutationFn: (input: CustomerInput) => createCustomer(shopId, input),
    onSuccess: changed,
  });
}

export function useUpdateCustomer(customerId: string) {
  const shopId = useShopId();
  const changed = useCustomersChanged();
  return useMutation({
    mutationFn: (input: Partial<CustomerInput>) =>
      updateCustomer(shopId, customerId, input),
    onSuccess: changed,
  });
}

export function useDeleteCustomer(customerId: string) {
  const shopId = useShopId();
  const changed = useCustomersChanged();
  return useMutation({
    mutationFn: () => deleteCustomer(shopId, customerId),
    onSuccess: changed,
  });
}
