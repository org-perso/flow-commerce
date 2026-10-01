import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useActiveShop } from '@/features/shop/use-shop';
import { asList, usePagedList } from '@/lib/paging';
import { isLocalImage, uploadProductImage } from '@/lib/product-image';

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
} from './product-api';

// Every product query of a shop lives under this prefix, so one invalidation
// refreshes lists, details and stock history after any change.
const productsKey = (shopId: string) => ['shops', shopId, 'products'] as const;

export function useProducts(filters: ProductFilters) {
  const shopId = useActiveShop().id;
  return useQuery({
    queryKey: [...productsKey(shopId), 'list', filters],
    queryFn: () => listProducts(shopId, filters),
  });
}

export function useStockSummary() {
  const shopId = useActiveShop().id;
  return useQuery({
    queryKey: [...productsKey(shopId), 'summary'],
    queryFn: () => getStockSummary(shopId),
  });
}

export function useProduct(productId: string) {
  const shopId = useActiveShop().id;
  return useQuery({
    queryKey: [...productsKey(shopId), 'detail', productId],
    queryFn: () => getProduct(shopId, productId),
  });
}

/** Stock history 30 by 30 (`items`, `loadMore`). */
export function useStockMovements(productId: string) {
  const shopId = useActiveShop().id;
  return usePagedList({
    queryKey: [...productsKey(shopId), 'movements', productId],
    fetchPage: (page) => listStockMovements(shopId, productId, page),
    pageItems: asList,
  });
}

/** Stock list 30 by 30 (`items`, `loadMore`). */
export function usePagedProducts(filters: ProductFilters) {
  const shopId = useActiveShop().id;
  return usePagedList({
    queryKey: [...productsKey(shopId), 'paged', filters],
    fetchPage: (page) => listProducts(shopId, filters, page),
    pageItems: asList,
  });
}

/** Mutation that refreshes all product data of the active shop on success. */
function useProductMutation<TVariables, TResult>(
  mutationFn: (shopId: string, variables: TVariables) => Promise<TResult>,
) {
  const shopId = useActiveShop().id;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: TVariables) => mutationFn(shopId, variables),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shops', shopId] }),
  });
}

/** A freshly picked photo is compressed and uploaded first; the product stores its URL. */
async function withUploadedImage<T extends { image?: string | null }>(shopId: string, input: T) {
  if (!input.image || !isLocalImage(input.image)) return input;
  return { ...input, image: await uploadProductImage(shopId, input.image) };
}

export function useCreateProduct() {
  return useProductMutation(async (shopId, input: ProductInput & { initialStock: number }) =>
    createProduct(shopId, await withUploadedImage(shopId, input)),
  );
}

export function useUpdateProduct(productId: string) {
  return useProductMutation(async (shopId, input: Partial<ProductInput>) =>
    updateProduct(shopId, productId, await withUploadedImage(shopId, input)),
  );
}

export function useArchiveProduct(productId: string) {
  return useProductMutation(async (shopId, archived: boolean) => {
    if (archived) await archiveProduct(shopId, productId);
    else await restoreProduct(shopId, productId);
  });
}

export function useCreateStockMovement(productId: string) {
  return useProductMutation(
    (shopId, input: { type: ManualMovementType; quantity: number; reason: string | null }) =>
      createStockMovement(shopId, productId, input),
  );
}

export function useCategories() {
  const shopId = useActiveShop().id;
  return useQuery({
    queryKey: ['shops', shopId, 'categories'],
    queryFn: () => listCategories(shopId),
    staleTime: 5 * 60_000,
  });
}

export function useCreateCategory() {
  return useProductMutation((shopId, name: string) => createCategory(shopId, name));
}
