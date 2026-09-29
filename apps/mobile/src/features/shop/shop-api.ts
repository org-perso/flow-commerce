import { apiFetch } from '@/lib/api-client';

export type Shop = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ShopInput = {
  name: string;
  description: string | null;
};

export function listShops(): Promise<Shop[]> {
  return apiFetch('/shops');
}

export function createShop(input: ShopInput): Promise<Shop> {
  return apiFetch('/shops', { method: 'POST', body: JSON.stringify(input) });
}

export function updateShop(shopId: string, input: ShopInput): Promise<Shop> {
  return apiFetch(`/shops/${shopId}`, { method: 'PATCH', body: JSON.stringify(input) });
}
