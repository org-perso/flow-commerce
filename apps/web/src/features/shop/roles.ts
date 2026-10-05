/** Roles in a shop and what each may do: mirrors the API (af-v2 §4). The app only hides. */
export const ROLES = ["OWNER", "MANAGER", "CM", "DRIVER"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Propriétaire",
  MANAGER: "Gérant",
  CM: "Community Manager",
  DRIVER: "Livreur",
};

/** One line explaining the role, shown when inviting or changing a role. */
export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  OWNER: "Tous les droits, dont l’équipe et les paramètres de la boutique.",
  MANAGER:
    "Gère la boutique au quotidien, les CM et les livreurs. Voit les chiffres.",
  CM: "Prend les commandes et gère les clients. Ne voit pas les chiffres.",
  DRIVER:
    "Voit seulement ses livraisons et celles à prendre. Livre et encaisse.",
};

const ROLE_PERMISSIONS = {
  OWNER: [
    "shop.settings",
    "dashboard",
    "costs",
    "expenses",
    "catalog.read",
    "catalog.write",
    "customers",
    "orders",
    "team",
  ],
  MANAGER: [
    "dashboard",
    "costs",
    "expenses",
    "catalog.read",
    "catalog.write",
    "customers",
    "orders",
    "team",
  ],
  CM: ["catalog.read", "customers", "orders"],
  DRIVER: ["deliveries"],
} as const satisfies Record<Role, readonly string[]>;

export type Permission = (typeof ROLE_PERMISSIONS)[Role][number];

export function can(role: Role, permission: Permission): boolean {
  return (ROLE_PERMISSIONS[role] as readonly Permission[]).includes(permission);
}

/** RG-58: an owner manages every role; a manager only CMs and drivers. */
export function canManageRole(actor: Role, role: Role): boolean {
  if (actor === "OWNER") return true;
  if (actor === "MANAGER") return role === "CM" || role === "DRIVER";
  return false;
}
