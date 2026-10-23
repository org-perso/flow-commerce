import type { Db } from '../../db/pool.js';

export type AuditTarget = 'shop' | 'user' | 'admin';

/** Reasons offered for actions on shops and users (af-v3-admin F-22). */
export const ACTION_REASONS = ['CONTENT', 'FRAUD', 'UNPAID', 'OWNER_REQUEST', 'OTHER'] as const;
export type ActionReason = (typeof ACTION_REASONS)[number];

export type AuditEntry = {
  action: string;
  targetType: AuditTarget;
  targetId: string;
  targetLabel?: string | null;
  reason?: ActionReason | null;
  details?: string | null;
};

/** RG-72: every admin action is logged; the log is never updated nor deleted. */
export async function logAction(db: Db, adminId: string, entry: AuditEntry): Promise<void> {
  await db.query(
    `INSERT INTO admin_actions (admin_id, action, target_type, target_id, target_label, reason, details)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      adminId,
      entry.action,
      entry.targetType,
      entry.targetId,
      entry.targetLabel?.slice(0, 200) ?? null,
      entry.reason ?? null,
      entry.details ?? null,
    ],
  );
}

export type AuditRow = {
  id: string;
  action: string;
  reason: string | null;
  details: string | null;
  createdAt: Date;
  admin: { id: string; username: string; name: string };
};

/** History of one target, newest first. */
export async function listActions(
  db: Db,
  targetType: AuditTarget,
  targetId: string,
): Promise<AuditRow[]> {
  const { rows } = await db.query<AuditRow>(
    `SELECT x.id, x.action, x.reason, x.details, x.created_at AS "createdAt",
            json_build_object('id', a.id, 'username', a.username, 'name', a.name) AS admin
     FROM admin_actions x JOIN admin_users a ON a.id = x.admin_id
     WHERE x.target_type = $1 AND x.target_id = $2
     ORDER BY x.created_at DESC
     LIMIT 200`,
    [targetType, targetId],
  );
  return rows;
}
