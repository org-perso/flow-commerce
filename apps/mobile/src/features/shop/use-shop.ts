import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '@/features/auth/auth-store';

import { createShop, getMyShop, updateShop } from './shop-api';

export function myShopQueryKey(uid: string | undefined) {
  return ['shop', 'me', uid] as const;
}

export function useMyShop() {
  const uid = useAuthStore((s) => s.user?.uid);
  return useQuery({
    queryKey: myShopQueryKey(uid),
    queryFn: getMyShop,
    enabled: uid !== undefined,
  });
}

export function useSaveShop(mode: 'create' | 'update') {
  const uid = useAuthStore((s) => s.user?.uid);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: mode === 'create' ? createShop : updateShop,
    onSuccess: (shop) => queryClient.setQueryData(myShopQueryKey(uid), shop),
  });
}
