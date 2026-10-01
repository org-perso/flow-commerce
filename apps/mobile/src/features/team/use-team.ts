import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '@/features/auth/auth-store';

import type { Shop } from '../shop/shop-api';
import type { Role } from '../shop/roles';
import { shopsQueryKey, useActiveShop, useSetActiveShop } from '../shop/use-shop';
import {
  changeMemberRole,
  createInvitation,
  joinShop,
  leaveShop,
  listInvitations,
  listMembers,
  removeMember,
  revokeInvitation,
  type InvitableRole,
} from './team-api';

const teamKey = (shopId: string) => ['shops', shopId, 'team'] as const;

export function useMembers() {
  const { id } = useActiveShop();
  return useQuery({ queryKey: [...teamKey(id), 'members'], queryFn: () => listMembers(id) });
}

export function useInvitations() {
  const { id } = useActiveShop();
  return useQuery({
    queryKey: [...teamKey(id), 'invitations'],
    queryFn: () => listInvitations(id),
  });
}

/** Mutations on the active shop's team, refreshing members and codes after each one. */
function useTeamMutation<T, R>(fn: (shopId: string, input: T) => Promise<R>) {
  const { id } = useActiveShop();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: T) => fn(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teamKey(id) }),
  });
}

export const useChangeMemberRole = () =>
  useTeamMutation((shopId, { userId, role }: { userId: string; role: Role }) =>
    changeMemberRole(shopId, userId, role),
  );
export const useRemoveMember = () =>
  useTeamMutation((shopId, userId: string) => removeMember(shopId, userId));
export const useCreateInvitation = () =>
  useTeamMutation((shopId, role: InvitableRole) => createInvitation(shopId, role));
export const useRevokeInvitation = () =>
  useTeamMutation((shopId, invitationId: string) => revokeInvitation(shopId, invitationId));

/** Joins with a code; the joined shop becomes the active one. */
export function useJoinShop() {
  const uid = useAuthStore((s) => s.user?.uid);
  const queryClient = useQueryClient();
  const setActiveShop = useSetActiveShop();
  return useMutation({
    mutationFn: joinShop,
    onSuccess: (shop) => {
      queryClient.setQueryData<Shop[]>(shopsQueryKey(uid), (shops = []) => [...shops, shop]);
      setActiveShop(shop.id);
    },
  });
}

/** Leaves the active shop; the app falls back to another shop, or to onboarding. */
export function useLeaveShop() {
  const uid = useAuthStore((s) => s.user?.uid);
  const { id } = useActiveShop();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => leaveShop(id),
    onSuccess: () =>
      queryClient.setQueryData<Shop[]>(shopsQueryKey(uid), (shops = []) =>
        shops.filter((s) => s.id !== id),
      ),
  });
}
