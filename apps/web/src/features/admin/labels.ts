import type { ActionReason, Plan } from "./admin-api";

export const REASON_LABELS: Record<ActionReason, string> = {
  CONTENT: "Contenu ou produits interdits",
  FRAUD: "Fraude ou arnaque signalée",
  UNPAID: "Impayé",
  OWNER_REQUEST: "Demande du propriétaire",
  OTHER: "Autre",
};

export const PLAN_LABELS: Record<Plan, string> = {
  FREE: "Gratuit",
  PRO: "Pro",
  BUSINESS: "Business",
};

/** Audit log actions (apps/api admin routes). */
export const ACTION_LABELS: Record<string, string> = {
  SHOP_WARNED: "Avertissement envoyé",
  SHOP_FLAGGED: "Boutique signalée",
  SHOP_UNFLAGGED: "Signalement retiré",
  SHOP_SUSPENDED: "Boutique suspendue",
  SHOP_REACTIVATED: "Boutique réactivée",
  USER_SUSPENDED: "Compte suspendu",
  USER_REACTIVATED: "Compte réactivé",
  ADMIN_CREATED: "Admin créé",
  ADMIN_DISABLED: "Admin désactivé",
  ADMIN_ENABLED: "Admin réactivé",
  ADMIN_PASSWORD_RESET: "Mot de passe réinitialisé",
  ADMIN_MFA_RESET: "MFA réinitialisée",
  ADMIN_MFA_REQUIRED: "MFA rendue obligatoire",
  ADMIN_MFA_OPTIONAL: "MFA rendue facultative",
};

export const reasonLabel = (reason: string | null) =>
  reason ? (REASON_LABELS[reason as ActionReason] ?? reason) : null;
