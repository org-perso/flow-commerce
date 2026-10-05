"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { shopsKey } from "@/features/shop/use-shops";
import { useShopId } from "@/features/shop/shop-context";
import type { Role } from "@/features/shop/roles";

import {
  changeMemberRole,
  createInvitation,
  leaveShop,
  listInvitations,
  listMembers,
  removeMember,
  revokeInvitation,
  type InvitableRole,
} from "./team-api";

export function useMembers() {
  const shopId = useShopId();
  return useQuery({
    queryKey: ["shop", shopId, "members"],
    queryFn: () => listMembers(shopId),
  });
}

export function useInvitations(enabled = true) {
  const shopId = useShopId();
  return useQuery({
    queryKey: ["shop", shopId, "invitations"],
    queryFn: () => listInvitations(shopId),
    enabled,
  });
}

function useTeamChanged() {
  const queryClient = useQueryClient();
  const shopId = useShopId();
  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["shop", shopId, "members"],
    });
    void queryClient.invalidateQueries({
      queryKey: ["shop", shopId, "invitations"],
    });
    void queryClient.invalidateQueries({
      queryKey: ["shop", shopId, "drivers"],
    });
  };
}

export function useChangeMemberRole() {
  const shopId = useShopId();
  const changed = useTeamChanged();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: Role }) =>
      changeMemberRole(shopId, userId, role),
    onSuccess: changed,
  });
}

export function useRemoveMember() {
  const shopId = useShopId();
  const changed = useTeamChanged();
  return useMutation({
    mutationFn: (userId: string) => removeMember(shopId, userId),
    onSuccess: changed,
  });
}

export function useCreateInvitation() {
  const shopId = useShopId();
  const changed = useTeamChanged();
  return useMutation({
    mutationFn: (role: InvitableRole) => createInvitation(shopId, role),
    onSuccess: changed,
  });
}

export function useRevokeInvitation() {
  const shopId = useShopId();
  const changed = useTeamChanged();
  return useMutation({
    mutationFn: (id: string) => revokeInvitation(shopId, id),
    onSuccess: changed,
  });
}

export function useLeaveShop() {
  const shopId = useShopId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => leaveShop(shopId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: shopsKey }),
  });
}
