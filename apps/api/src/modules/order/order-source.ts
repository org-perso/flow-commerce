export const ORDER_SOURCES = [
  'FACEBOOK',
  'MESSENGER',
  'INSTAGRAM',
  'WHATSAPP',
  'TIKTOK',
  'APPEL',
  'BOUTIQUE',
  'AUTRE',
] as const;
export type OrderSource = (typeof ORDER_SOURCES)[number];
