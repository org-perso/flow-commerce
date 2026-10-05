import type { OrderSource } from "./order-api";

export const ORDER_STATUSES = [
  "EN_ATTENTE",
  "CONFIRMEE",
  "EN_PREPARATION",
  "EN_LIVRAISON",
  "LIVREE",
  "ANNULEE",
  "RETOUR",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  EN_ATTENTE: "En attente",
  CONFIRMEE: "Confirmée",
  EN_PREPARATION: "En préparation",
  EN_LIVRAISON: "En livraison",
  LIVREE: "Livrée",
  ANNULEE: "Annulée",
  RETOUR: "Retour",
};

/** Badge colors (bg / fg pairs of the brand charter). */
export const STATUS_CLASSES: Record<
  OrderStatus,
  { badge: string; dot: string }
> = {
  EN_ATTENTE: {
    badge: "bg-st-pending-bg text-st-pending-fg",
    dot: "bg-st-pending-fg",
  },
  CONFIRMEE: {
    badge: "bg-st-confirmed-bg text-st-confirmed-fg",
    dot: "bg-st-confirmed-fg",
  },
  EN_PREPARATION: {
    badge: "bg-st-preparing-bg text-st-preparing-fg",
    dot: "bg-st-preparing-fg",
  },
  EN_LIVRAISON: {
    badge: "bg-st-shipping-bg text-st-shipping-fg",
    dot: "bg-st-shipping-fg",
  },
  LIVREE: {
    badge: "bg-st-delivered-bg text-st-delivered-fg",
    dot: "bg-st-delivered-fg",
  },
  ANNULEE: {
    badge: "bg-st-cancelled-bg text-st-cancelled-fg",
    dot: "bg-st-cancelled-fg",
  },
  RETOUR: {
    badge: "bg-st-returned-bg text-st-returned-fg",
    dot: "bg-st-returned-fg",
  },
};

/** Mirrors the API's TRANSITIONS table (apps/api/src/modules/order/order-status.ts). */
export const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  EN_ATTENTE: ["CONFIRMEE", "ANNULEE"],
  CONFIRMEE: ["EN_PREPARATION", "EN_LIVRAISON", "LIVREE", "ANNULEE"],
  EN_PREPARATION: ["EN_LIVRAISON", "LIVREE", "ANNULEE"],
  EN_LIVRAISON: ["LIVREE", "ANNULEE", "RETOUR"],
  LIVREE: ["RETOUR"],
  ANNULEE: [],
  RETOUR: [],
};

/** Button label to move an order to this status. */
export const actionLabels: Record<OrderStatus, string> = {
  EN_ATTENTE: "Remettre en attente",
  CONFIRMEE: "Confirmer la commande",
  EN_PREPARATION: "Passer en préparation",
  EN_LIVRAISON: "Mettre en livraison",
  LIVREE: "Marquer comme livrée",
  ANNULEE: "Annuler la commande",
  RETOUR: "Enregistrer un retour",
};

/** Short labels for quick actions. */
export const quickActionLabels: Partial<Record<OrderStatus, string>> = {
  CONFIRMEE: "Confirmer",
  EN_PREPARATION: "Préparer",
  EN_LIVRAISON: "Expédier",
  LIVREE: "Marquer livrée",
};

/** Orders still to be handled (not delivered, cancelled or returned). */
export const OPEN_STATUSES: readonly OrderStatus[] = [
  "EN_ATTENTE",
  "CONFIRMEE",
  "EN_PREPARATION",
  "EN_LIVRAISON",
];

/** Cancelling / returning gives the stock back: always confirmed by the user. */
export const destructiveStatuses: readonly OrderStatus[] = [
  "ANNULEE",
  "RETOUR",
];

export const confirmTexts: Partial<
  Record<OrderStatus, { title: string; message: string }>
> = {
  ANNULEE: {
    title: "Annuler la commande ?",
    message:
      "Si le stock avait été retiré, il sera remis. Cette action est définitive.",
  },
  RETOUR: {
    title: "Enregistrer un retour ?",
    message: "Les produits seront remis en stock. Cette action est définitive.",
  },
};

export const PAYMENT_METHODS = [
  "Espèces",
  "MVola",
  "Orange Money",
  "Airtel Money",
] as const;

export const SOURCE_LABELS: Record<OrderSource, string> = {
  FACEBOOK: "Facebook",
  MESSENGER: "Messenger",
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  APPEL: "Appel",
  BOUTIQUE: "En boutique",
  AUTRE: "Autre",
};
