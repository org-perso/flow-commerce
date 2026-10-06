import { formatAr, formatDayLabel } from '@/utils/format';

import { parcelNumber, type Order } from './order-api';
import { slotLabel } from './time-slot';

/**
 * The order summary sent to the customer on WhatsApp:
 * "Bonjour Rasoa, votre commande #042 : 2 × Savon coco… Total 12 500 Ar. Livraison demain…"
 */
export function orderRecapMessage(order: Order, shopName: string): string {
  const hello = order.customer ? `Bonjour ${order.customer.name},` : 'Bonjour,';
  const items = (order.items ?? []).map((i) => `• ${i.quantity} × ${i.productName}`);
  const when = [formatDayLabel(order.scheduledDate).toLowerCase(), slotLabel(order.timeSlot)]
    .filter(Boolean)
    .join(', ');
  const handOver = order.delivery
    ? `Livraison ${when}${order.delivery.place ? ` à ${order.delivery.place}` : ''}.`
    : `À récupérer ${when}.`;
  const total = `Total : ${formatAr(order.totalAmount)}${
    order.deliveryFee > 0 ? ` (dont livraison ${formatAr(order.deliveryFee)})` : ''
  }${order.isPaid ? ' · payée, merci !' : ''}`;
  return [
    `${hello} voici votre commande ${parcelNumber(order)} chez ${shopName} :`,
    ...items,
    total,
    handOver,
  ].join('\n');
}
