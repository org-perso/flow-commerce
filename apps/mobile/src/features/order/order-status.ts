import type { OrderStatus } from '@/components/ui';

import type { OrderSource } from './order-api';

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

/** Short labels for the quick action on list cards. */
export const quickActionLabels: Partial<Record<OrderStatus, string>> = {
  CONFIRMEE: 'Confirmer',
  EN_PREPARATION: 'Préparer',
  EN_LIVRAISON: 'Expédier',
  LIVREE: 'Marquer livrée',
};

/** Orders still to be handled (not delivered, cancelled or returned). */
export const OPEN_STATUSES: readonly OrderStatus[] = [
  'EN_ATTENTE',
  'CONFIRMEE',
  'EN_PREPARATION',
  'EN_LIVRAISON',
];

/** Cancelling / returning gives the stock back: always confirmed by the user. */
export const destructiveStatuses: readonly OrderStatus[] = ['ANNULEE', 'RETOUR'];

export const PAYMENT_METHODS = ['Espèces', 'MVola', 'Orange Money', 'Airtel Money'] as const;

export const SOURCE_LABELS: Record<OrderSource, string> = {
  FACEBOOK: 'Facebook',
  MESSENGER: 'Messenger',
  WHATSAPP: 'WhatsApp',
  INSTAGRAM: 'Instagram',
  TIKTOK: 'TikTok',
  APPEL: 'Appel',
  BOUTIQUE: 'En boutique',
  AUTRE: 'Autre',
};
