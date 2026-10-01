import { randomInt } from 'node:crypto';

import type pg from 'pg';

import { pool, withTransaction, type Db } from '../../db/pool.js';
import { ProblemError } from '../../http/problem.js';
import type { Member, ShopWithRole } from '../shop/shop.repository.js';
import type { Role } from '../shop/permissions.js';

export type InvitableRole = Exclude<Role, 'OWNER'>;

export type TeamMember = {
  userId: string;
  name: string | null;
  email: string | null;
  role: Role;
  joinedAt: Date;
};

export type Invitation = {
  id: string;
  code: string;
  role: InvitableRole;
  expiresAt: Date;
  createdAt: Date;
};

/** Codes are typed by hand: no 0/O, 1/I/L. */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const INVITATION_DAYS = 7;

const forbidden = (detail: string) => new ProblemError(403, 'Forbidden', detail);

/**
 * RG-58: an owner manages every role; a manager only CMs and drivers, and can only
 * give those roles.
 */
export function canManageRole(actor: Role, role: Role): boolean {
  if (actor === 'OWNER') return true;
  if (actor === 'MANAGER') return role === 'CM' || role === 'DRIVER';
  return false;
}

// Members --------------------------------------------------------------------

export async function listMembers(shopId: string, db: Db = pool): Promise<TeamMember[]> {
  const { rows } = await db.query<TeamMember>(
    `SELECT u.id AS "userId", u.name, u.email, m.role, m.created_at AS "joinedAt"
     FROM shop_members m JOIN users u ON u.id = m.user_id
     WHERE m.shop_id = $1
     ORDER BY array_position(ARRAY['OWNER','MANAGER','CM','DRIVER']::varchar[], m.role),
              m.created_at`,
    [shopId],
  );
  return rows;
}

/**
 * Locks the shop row so owner counts cannot race (RG-50), then returns the target's role.
 */
async function lockAndFindRole(
  client: pg.PoolClient,
  shopId: string,
  userId: string,
): Promise<Role> {
  await client.query('SELECT 1 FROM shops WHERE id = $1 FOR UPDATE', [shopId]);
  const { rows } = await client.query<{ role: Role }>(
    'SELECT role FROM shop_members WHERE shop_id = $1 AND user_id = $2',
    [shopId, userId],
  );
  if (!rows[0]) throw new ProblemError(404, 'Not Found', 'Member not found.');
  return rows[0].role;
}

async function assertNotLastOwner(client: pg.PoolClient, shopId: string) {
  const { rows } = await client.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM shop_members WHERE shop_id = $1 AND role = 'OWNER'`,
    [shopId],
  );
  if (rows[0]!.n <= 1) {
    throw new ProblemError(409, 'Conflict', 'A shop needs at least one owner.', {
      code: 'LAST_OWNER',
    });
  }
}

export function changeMemberRole(
  shopId: string,
  actor: Member,
  userId: string,
  role: Role,
): Promise<TeamMember> {
  return withTransaction(async (client) => {
    const current = await lockAndFindRole(client, shopId, userId);
    if (!canManageRole(actor.role, current) || !canManageRole(actor.role, role)) {
      throw forbidden('Your role cannot give or change this role.');
    }
    if (current === 'OWNER' && role !== 'OWNER') await assertNotLastOwner(client, shopId);
    await client.query('UPDATE shop_members SET role = $3 WHERE shop_id = $1 AND user_id = $2', [
      shopId,
      userId,
      role,
    ]);
    // A driver who changes role keeps no delivery.
    if (current === 'DRIVER' && role !== 'DRIVER')
      await unassignOpenDeliveries(client, shopId, userId);
    return (await listMembers(shopId, client)).find((m) => m.userId === userId)!;
  });
}

/** RG-56: the member loses access at once; their open deliveries become unassigned. */
async function deleteMember(client: pg.PoolClient, shopId: string, userId: string) {
  await unassignOpenDeliveries(client, shopId, userId);
  await client.query('DELETE FROM shop_members WHERE shop_id = $1 AND user_id = $2', [
    shopId,
    userId,
  ]);
}

async function unassignOpenDeliveries(client: pg.PoolClient, shopId: string, userId: string) {
  await client.query(
    `UPDATE orders SET assigned_to = NULL, assigned_at = NULL, delivery_notified_at = NULL
     WHERE shop_id = $1 AND assigned_to = $2
       AND status NOT IN ('LIVREE', 'ANNULEE', 'RETOUR')`,
    [shopId, userId],
  );
}

export function removeMember(shopId: string, actor: Member, userId: string): Promise<void> {
  return withTransaction(async (client) => {
    const role = await lockAndFindRole(client, shopId, userId);
    if (!canManageRole(actor.role, role)) throw forbidden('Your role cannot remove this member.');
    if (role === 'OWNER') await assertNotLastOwner(client, shopId);
    await deleteMember(client, shopId, userId);
  });
}

/** Any member can leave, except the last owner (RG-50). */
export function leaveShop(shopId: string, userId: string): Promise<void> {
  return withTransaction(async (client) => {
    const role = await lockAndFindRole(client, shopId, userId);
    if (role === 'OWNER') await assertNotLastOwner(client, shopId);
    await deleteMember(client, shopId, userId);
  });
}

// Invitations ----------------------------------------------------------------

const invitationColumns = `id, code, role, expires_at AS "expiresAt", created_at AS "createdAt"`;

/** Pending codes (not used, revoked or expired) the actor may see. */
export async function listInvitations(shopId: string, actor: Member): Promise<Invitation[]> {
  const { rows } = await pool.query<Invitation>(
    `SELECT ${invitationColumns} FROM shop_invitations
     WHERE shop_id = $1 AND used_at IS NULL AND revoked_at IS NULL AND expires_at > now()
     ORDER BY created_at DESC`,
    [shopId],
  );
  return rows.filter((i) => canManageRole(actor.role, i.role));
}

function generateCode(): string {
  return Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
}

export async function createInvitation(
  shopId: string,
  actor: Member,
  role: InvitableRole,
): Promise<Invitation> {
  if (!canManageRole(actor.role, role)) throw forbidden('Your role cannot invite this role.');
  // A clash among ~900 million codes is rare: retry a few times on the unique code.
  for (let attempt = 0; ; attempt++) {
    try {
      const { rows } = await pool.query<Invitation>(
        `INSERT INTO shop_invitations (shop_id, code, role, created_by, expires_at)
         VALUES ($1, $2, $3, $4, now() + make_interval(days => $5))
         RETURNING ${invitationColumns}`,
        [shopId, generateCode(), role, actor.userId, INVITATION_DAYS],
      );
      return rows[0]!;
    } catch (error) {
      if ((error as { code?: string }).code !== '23505' || attempt >= 4) throw error;
    }
  }
}

export async function revokeInvitation(
  shopId: string,
  actor: Member,
  invitationId: string,
): Promise<void> {
  const { rows } = await pool.query<{ role: InvitableRole }>(
    `SELECT role FROM shop_invitations
     WHERE id = $1 AND shop_id = $2 AND used_at IS NULL AND revoked_at IS NULL`,
    [invitationId, shopId],
  );
  if (!rows[0]) throw new ProblemError(404, 'Not Found', 'Invitation not found.');
  if (!canManageRole(actor.role, rows[0].role)) {
    throw forbidden('Your role cannot cancel this invitation.');
  }
  await pool.query('UPDATE shop_invitations SET revoked_at = now() WHERE id = $1', [invitationId]);
}

/** RG-52 / RG-53: a valid code makes the user a member with the code's role, once. */
export function joinWithCode(userId: string, rawCode: string): Promise<ShopWithRole> {
  const code = rawCode.trim().toUpperCase();
  return withTransaction(async (client) => {
    const { rows } = await client.query<{
      id: string;
      shopId: string;
      role: InvitableRole;
      usable: boolean;
    }>(
      `SELECT id, shop_id AS "shopId", role,
              used_at IS NULL AND revoked_at IS NULL AND expires_at > now() AS usable
       FROM shop_invitations WHERE code = $1 FOR UPDATE`,
      [code],
    );
    const invitation = rows[0];
    if (!invitation) {
      throw new ProblemError(404, 'Not Found', 'Unknown invitation code.', {
        code: 'INVITATION_UNKNOWN',
      });
    }
    if (!invitation.usable) {
      throw new ProblemError(410, 'Gone', 'This invitation code is used or expired.', {
        code: 'INVITATION_EXPIRED',
      });
    }
    const joined = await client.query(
      `INSERT INTO shop_members (shop_id, user_id, role) VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [invitation.shopId, userId, invitation.role],
    );
    if (joined.rowCount === 0) {
      throw new ProblemError(409, 'Conflict', 'You are already a member of this shop.', {
        code: 'ALREADY_MEMBER',
      });
    }
    await client.query('UPDATE shop_invitations SET used_by = $2, used_at = now() WHERE id = $1', [
      invitation.id,
      userId,
    ]);
    const shop = await client.query<ShopWithRole>(
      `SELECT id, name, description, created_at AS "createdAt", updated_at AS "updatedAt",
              $2::varchar AS role
       FROM shops WHERE id = $1`,
      [invitation.shopId, invitation.role],
    );
    return shop.rows[0]!;
  });
}
