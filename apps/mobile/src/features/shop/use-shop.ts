import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useAuthStore } from '@/features/auth/auth-store';
import type { StatusColors } from '@/theme/state-colors';

import { useActiveShopStore } from './active-shop-store';
import { can, type Permission } from './roles';
import {
  createShop,
  listShops,
  setMyNickname,
  updateShop,
  updateStatusColors,
  type Shop,
  type ShopInput,
} from './shop-api';

export const shopsQueryKey = (uid: string | undefined) => ['shops', uid] as const;

function useUid() {
  return useAuthStore((s) => s.user?.uid);
}

export function useShops() {
  const uid = useUid();
  return useQuery({ queryKey: shopsQueryKey(uid), queryFn: listShops, enabled: !!uid });
}

/**
 * The shop the app currently works on: the last one picked, or the first one.
 * Only used below the root guard, where the user has at least one shop.
 * When the shop list empties (sign-out, shop deleted), the guard unmounts these screens but
 * they render once more first: they then get the last known shop instead of crashing.
 */
export function useActiveShop(): Shop {
  const uid = useUid();
  const { data: shops = [] } = useShops();
  const activeId = useActiveShopStore((s) => (uid ? s.byUser[uid] : undefined));
  const current = shops.find((s) => s.id === activeId) ?? shops[0];
  const [lastShop, setLastShop] = useState(current);
  if (current && current !== lastShop) setLastShop(current);
  const shop = current ?? lastShop;
  if (!shop) throw new Error('useActiveShop used without any shop');
  return shop;
}

export function useSetActiveShop() {
  const uid = useUid();
  const setActiveShop = useActiveShopStore((s) => s.setActiveShop);
  return (shopId: string) => {
    if (uid) setActiveShop(uid, shopId);
  };
}

/** Creates a shop and makes it the active one. */
export function useCreateShop() {
  const uid = useUid();
  const queryClient = useQueryClient();
  const setActive = useSetActiveShop();
  return useMutation({
    mutationFn: createShop,
    onSuccess: (shop) => {
      queryClient.setQueryData<Shop[]>(shopsQueryKey(uid), (shops = []) => [...shops, shop]);
      setActive(shop.id);
    },
  });
}

export function useUpdateShop(shopId: string) {
  const uid = useUid();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ShopInput) => updateShop(shopId, input),
    onSuccess: (shop) => {
      // Merged: the PATCH response has no pseudo (nickname), the list does.
      queryClient.setQueryData<Shop[]>(shopsQueryKey(uid), (shops = []) =>
        shops.map((s) => (s.id === shop.id ? { ...s, ...shop } : s)),
      );
    },
  });
}

export function useUpdateStatusColors(shopId: string) {
  const uid = useUid();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (colors: StatusColors) => updateStatusColors(shopId, colors),
    onSuccess: (shop) => {
      queryClient.setQueryData<Shop[]>(shopsQueryKey(uid), (shops = []) =>
        shops.map((s) => (s.id === shop.id ? { ...s, ...shop } : s)),
      );
    },
  });
}

/** Whether the current member's role allows `permission` in the active shop. */
export function useCan(permission: Permission): boolean {
  return can(useActiveShop().role, permission);
}

/** Sets my pseudo in the active shop and updates the shop list. */
export function useSetMyNickname() {
  const uid = useUid();
  const { id } = useActiveShop();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (nickname: string | null) => setMyNickname(id, nickname),
    onSuccess: ({ nickname }) =>
      queryClient.setQueryData<Shop[]>(shopsQueryKey(uid), (shops = []) =>
        shops.map((s) => (s.id === id ? { ...s, nickname } : s)),
      ),
  });
}
