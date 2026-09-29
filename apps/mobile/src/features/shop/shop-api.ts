import AsyncStorage from '@react-native-async-storage/async-storage';

import { ApiError, apiFetch, apiUrl } from '@/lib/api-client';
import { auth } from '@/lib/firebase';

export type Shop = {
  id: string;
  name: string;
  description: string | null;
};

export type ShopInput = {
  name: string;
  description: string | null;
};

/** Returns the current user's shop, or null if they have not created one yet. */
export async function getMyShop(): Promise<Shop | null> {
  if (!apiUrl) return mock.get();
  try {
    return await apiFetch<Shop>('/shops/me');
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export function createShop(input: ShopInput): Promise<Shop> {
  if (!apiUrl) return mock.create(input);
  return apiFetch<Shop>('/shops', { method: 'POST', body: JSON.stringify(input) });
}

export function updateShop(input: ShopInput): Promise<Shop> {
  if (!apiUrl) return mock.update(input);
  return apiFetch<Shop>('/shops/me', { method: 'PATCH', body: JSON.stringify(input) });
}

// TEMPORARY: on-device stand-in until the shop endpoints exist. Remove with the backend.
const mock = {
  key: () => `mock-shop:${auth.currentUser?.uid}`,
  async get(): Promise<Shop | null> {
    const raw = await AsyncStorage.getItem(mock.key());
    return raw ? (JSON.parse(raw) as Shop) : null;
  },
  async create(input: ShopInput): Promise<Shop> {
    if (await mock.get()) throw new ApiError(409, 'Conflict', 'Vous avez déjà une boutique.');
    const shop: Shop = { id: `mock-${Date.now()}`, ...input };
    await AsyncStorage.setItem(mock.key(), JSON.stringify(shop));
    return shop;
  },
  async update(input: ShopInput): Promise<Shop> {
    const current = await mock.get();
    if (!current) throw new ApiError(404, 'Not Found');
    const shop = { ...current, ...input };
    await AsyncStorage.setItem(mock.key(), JSON.stringify(shop));
    return shop;
  },
};
