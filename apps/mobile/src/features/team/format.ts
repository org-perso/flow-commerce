import { ROLE_LABELS, type Role } from '../shop/roles';

import type { Member } from './team-api';

export const memberName = (m: Pick<Member, 'nickname' | 'name' | 'email'>) =>
  m.nickname || m.name || m.email || 'Membre';

/** "expire dans 6 j" / "expire aujourd'hui". */
export function expiresIn(iso: string): string {
  const days = Math.floor((new Date(iso).getTime() - Date.now()) / 86_400_000);
  return days >= 1 ? `expire dans ${days} j` : 'expire aujourd’hui';
}

export const SECTION_TITLES: Record<Role, string> = {
  OWNER: 'Propriétaires',
  MANAGER: 'Gérants',
  CM: 'Community managers',
  DRIVER: 'Livreurs',
};

/** Message shared with the person invited. */
export function invitationMessage(shopName: string, role: Role, code: string): string {
  return (
    `Rejoins la boutique ${shopName} sur Flow.Co en tant que ` +
    `${ROLE_LABELS[role].toLowerCase()}. Code : ${code} (valable 7 jours).`
  );
}
