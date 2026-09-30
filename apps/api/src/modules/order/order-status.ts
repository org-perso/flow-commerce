export const ORDER_STATUSES = [
  'EN_ATTENTE',
  'CONFIRMEE',
  'EN_PREPARATION',
  'EN_LIVRAISON',
  'LIVREE',
  'ANNULEE',
  'RETOUR',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * Statuses where the order holds stock, i.e. counts as a sale.
 * Decision: stock is taken when the order is confirmed, not when it is created.
 */
export const STOCK_TAKEN_STATUSES: readonly OrderStatus[] = [
  'CONFIRMEE',
  'EN_PREPARATION',
  'EN_LIVRAISON',
  'LIVREE',
];

/** Allowed status changes. ANNULEE and RETOUR are final. */
export const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  EN_ATTENTE: ['CONFIRMEE', 'ANNULEE'],
  CONFIRMEE: ['EN_PREPARATION', 'EN_LIVRAISON', 'LIVREE', 'ANNULEE'],
  EN_PREPARATION: ['EN_LIVRAISON', 'LIVREE', 'ANNULEE'],
  EN_LIVRAISON: ['LIVREE', 'ANNULEE', 'RETOUR'],
  LIVREE: ['RETOUR'],
  ANNULEE: [],
  RETOUR: [],
};

/** Orders still to be handled: not delivered, cancelled or returned. */
export const OPEN_STATUSES: readonly OrderStatus[] = [
  'EN_ATTENTE',
  'CONFIRMEE',
  'EN_PREPARATION',
  'EN_LIVRAISON',
];

export const holdsStock = (status: OrderStatus) => STOCK_TAKEN_STATUSES.includes(status);
