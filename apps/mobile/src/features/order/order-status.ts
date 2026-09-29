import type { OrderStatus } from '@/components/ui';

/** Mirrors the API's TRANSITIONS table (apps/api/src/modules/order/order-status.ts). */
export const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  EN_ATTENTE: ['CONFIRMEE', 'ANNULEE'],
  CONFIRMEE: ['EN_PREPARATION', 'EN_LIVRAISON', 'LIVREE', 'ANNULEE'],
  EN_PREPARATION: ['EN_LIVRAISON', 'LIVREE', 'ANNULEE'],
  EN_LIVRAISON: ['LIVREE', 'ANNULEE', 'RETOUR'],
  LIVREE: ['RETOUR'],
  ANNULEE: [],
  RETOUR: [],
};

/** Button label to move an order to this status. */
export const actionLabels: Record<OrderStatus, string> = {
  EN_ATTENTE: 'Remettre en attente',
  CONFIRMEE: 'Confirmer la commande',
  EN_PREPARATION: 'Passer en préparation',
  EN_LIVRAISON: 'Mettre en livraison',
  LIVREE: 'Marquer comme livrée',
  ANNULEE: 'Annuler la commande',
  RETOUR: 'Enregistrer un retour',
};

/** Cancelling / returning gives the stock back: always confirmed by the user. */
export const destructiveStatuses: readonly OrderStatus[] = ['ANNULEE', 'RETOUR'];

export const PAYMENT_METHODS = ['Espèces', 'MVola', 'Orange Money', 'Airtel Money'] as const;
