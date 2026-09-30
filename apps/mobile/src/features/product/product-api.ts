import { apiFetch } from '@/lib/api-client';

export type Product = {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  category: Category | null;
  purchasePrice: number;
  sellingPrice: number;
  stockQuantity: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Category = { id: string; name: string };

export type ProductInput = {
  name: string;
  description: string | null;
  image: string | null;
  categoryId: string | null;
  purchasePrice: number;
  sellingPrice: number;
  lowStockThreshold: number;
};

export type ProductFilters = {
  q?: string;
  lowStock?: boolean;
  outOfStock?: boolean;
  archived?: boolean;
};

export type StockSummary = {
  productCount: number;
  units: number;
  /** Stock valued at purchase / selling price. */
  stockValue: number;
  stockSaleValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  archivedCount: number;
};

export type ManualMovementType = 'AJOUT' | 'RETRAIT' | 'AJUSTEMENT';

export type StockMovement = {
  id: string;
  productId: string;
  orderId: string | null;
  type: ManualMovementType | 'VENTE' | 'RETOUR';
  /** Signed: positive adds stock, negative removes it. */
  quantity: number;
  reason: string | null;
  createdAt: string;
};

const base = (shopId: string) => `/shops/${shopId}/products`;

export function listProducts(shopId: string, filters: ProductFilters): Promise<Product[]> {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.lowStock) params.set('lowStock', 'true');
  if (filters.outOfStock) params.set('outOfStock', 'true');
  if (filters.archived) params.set('archived', 'true');
  const query = params.toString();
  return apiFetch(`${base(shopId)}${query ? `?${query}` : ''}`);
}

export function getStockSummary(shopId: string): Promise<StockSummary> {
  return apiFetch(`${base(shopId)}/summary`);
}

export function getProduct(shopId: string, productId: string): Promise<Product> {
  return apiFetch(`${base(shopId)}/${productId}`);
}

export function createProduct(
  shopId: string,
  input: ProductInput & { initialStock: number },
): Promise<Product> {
  return apiFetch(base(shopId), { method: 'POST', body: JSON.stringify(input) });
}

export function updateProduct(
  shopId: string,
  productId: string,
  input: Partial<ProductInput>,
): Promise<Product> {
  return apiFetch(`${base(shopId)}/${productId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function archiveProduct(shopId: string, productId: string): Promise<void> {
  return apiFetch(`${base(shopId)}/${productId}`, { method: 'DELETE' });
}

export function restoreProduct(shopId: string, productId: string): Promise<Product> {
  return apiFetch(`${base(shopId)}/${productId}/restore`, { method: 'POST' });
}

export function listStockMovements(shopId: string, productId: string): Promise<StockMovement[]> {
  return apiFetch(`${base(shopId)}/${productId}/stock-movements?limit=50`);
}

export function createStockMovement(
  shopId: string,
  productId: string,
  input: { type: ManualMovementType; quantity: number; reason: string | null },
): Promise<{ movement: StockMovement; stockQuantity: number }> {
  return apiFetch(`${base(shopId)}/${productId}/stock-movements`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function listCategories(shopId: string): Promise<Category[]> {
  return apiFetch(`/shops/${shopId}/categories`);
}

export function createCategory(shopId: string, name: string): Promise<Category> {
  return apiFetch(`/shops/${shopId}/categories`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}
