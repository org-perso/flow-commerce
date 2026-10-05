"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { useCan, useShopId } from "@/features/shop/shop-context";
import type { Page } from "@/lib/paging";

import {
  archiveProduct,
  createCategory,
  createProduct,
  createStockMovement,
  getProduct,
  getStockSummary,
  listCategories,
  listProducts,
  listStockMovements,
  restoreProduct,
  updateProduct,
  type ManualMovementType,
  type ProductFilters,
  type ProductInput,
} from "./product-api";

const productsKey = (shopId: string) => ["shop", shopId, "products"] as const;

export function useProducts(
  filters: ProductFilters,
  page?: Page,
  enabled = true,
) {
  const shopId = useShopId();
  return useQuery({
    queryKey: [...productsKey(shopId), "list", filters, page],
    queryFn: () => listProducts(shopId, filters, page),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useStockSummary() {
  const shopId = useShopId();
  return useQuery({
    queryKey: [...productsKey(shopId), "summary"],
    queryFn: () => getStockSummary(shopId),
  });
}

export function useProduct(productId: string | undefined) {
  const shopId = useShopId();
  return useQuery({
    queryKey: [...productsKey(shopId), "detail", productId],
    queryFn: () => getProduct(shopId, productId!),
    enabled: !!productId,
  });
}

function useProductsChanged() {
  const queryClient = useQueryClient();
  const shopId = useShopId();
  return () => {
    void queryClient.invalidateQueries({ queryKey: productsKey(shopId) });
    void queryClient.invalidateQueries({
      queryKey: ["shop", shopId, "dashboard"],
    });
  };
}

export function useCreateProduct() {
  const shopId = useShopId();
  const changed = useProductsChanged();
  return useMutation({
    mutationFn: (input: ProductInput & { initialStock: number }) =>
      createProduct(shopId, input),
    onSuccess: changed,
  });
}

export function useUpdateProduct(productId: string) {
  const shopId = useShopId();
  const changed = useProductsChanged();
  return useMutation({
    mutationFn: (input: Partial<ProductInput>) =>
      updateProduct(shopId, productId, input),
    onSuccess: changed,
  });
}

export function useArchiveProduct(productId: string) {
  const shopId = useShopId();
  const changed = useProductsChanged();
  return useMutation({
    mutationFn: () => archiveProduct(shopId, productId),
    onSuccess: changed,
  });
}

export function useRestoreProduct(productId: string) {
  const shopId = useShopId();
  const changed = useProductsChanged();
  return useMutation({
    mutationFn: () => restoreProduct(shopId, productId),
    onSuccess: changed,
  });
}

export function useStockMovements(productId: string, page: Page) {
  const shopId = useShopId();
  return useQuery({
    queryKey: [...productsKey(shopId), "movements", productId, page],
    queryFn: () => listStockMovements(shopId, productId, page),
    placeholderData: keepPreviousData,
  });
}

export function useCreateStockMovement(productId: string) {
  const shopId = useShopId();
  const changed = useProductsChanged();
  return useMutation({
    mutationFn: (input: {
      type: ManualMovementType;
      quantity: number;
      reason: string | null;
    }) => createStockMovement(shopId, productId, input),
    onSuccess: changed,
  });
}

export function useCategories() {
  const shopId = useShopId();
  const allowed = useCan("catalog.read");
  return useQuery({
    queryKey: ["shop", shopId, "categories"],
    queryFn: () => listCategories(shopId),
    enabled: allowed,
  });
}

export function useCreateCategory() {
  const shopId = useShopId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createCategory(shopId, name),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["shop", shopId, "categories"],
      }),
  });
}
