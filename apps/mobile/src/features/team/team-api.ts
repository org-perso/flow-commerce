import { apiFetch } from '@/lib/api-client';

import type { Shop } from '../shop/shop-api';
import type { Role } from '../shop/roles';

export type InvitableRole = Exclude<Role, 'OWNER'>;

export type Member = {
  userId: string;
  /** Account name. */
  name: string | null;
  /** Pseudo in this shop, shown instead of the name. */
  nickname: string | null;
  email: string | null;
  role: Role;
  joinedAt: string;
};

export type Invitation = {
  id: string;
  code: string;
  role: InvitableRole;
  expiresAt: string;
  createdAt: string;
};

export function listMembers(shopId: string): Promise<Member[]> {
  return apiFetch(`/shops/${shopId}/members`);
}

export function changeMemberRole(shopId: string, userId: string, role: Role): Promise<Member> {
  return apiFetch(`/shops/${shopId}/members/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

export function removeMember(shopId: string, userId: string): Promise<void> {
  return apiFetch(`/shops/${shopId}/members/${userId}`, { method: 'DELETE' });
}

export function listInvitations(shopId: string): Promise<Invitation[]> {
  return apiFetch(`/shops/${shopId}/invitations`);
}

export function createInvitation(shopId: string, role: InvitableRole): Promise<Invitation> {
  return apiFetch(`/shops/${shopId}/invitations`, {
    method: 'POST',
    body: JSON.stringify({ role }),
  });
}

export function revokeInvitation(shopId: string, invitationId: string): Promise<void> {
  return apiFetch(`/shops/${shopId}/invitations/${invitationId}`, { method: 'DELETE' });
}

export function joinShop(input: { code: string; nickname: string | null }): Promise<Shop> {
  return apiFetch('/invitations/join', { method: 'POST', body: JSON.stringify(input) });
}

export function leaveShop(shopId: string): Promise<void> {
  return apiFetch(`/shops/${shopId}/leave`, { method: 'POST' });
}
