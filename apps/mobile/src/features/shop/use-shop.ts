import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '@/features/auth/auth-store';

import { useActiveShopStore } from './active-shop-store';
import { createShop, listShops, updateShop, type Shop, type ShopInput } from './shop-api';

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
 */
export function useActiveShop(): Shop {
  const uid = useUid();
  const { data: shops = [] } = useShops();
  const activeId = useActiveShopStore((s) => (uid ? s.byUser[uid] : undefined));
  const shop = shops.find((s) => s.id === activeId) ?? shops[0];
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
      queryClient.setQueryData<Shop[]>(shopsQueryKey(uid), (shops = []) =>
        shops.map((s) => (s.id === shop.id ? shop : s)),
      );
    },
  });
}
