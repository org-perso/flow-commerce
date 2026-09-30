import type { OrderStatus } from '@/components/ui';
import { apiFetch } from '@/lib/api-client';

export type OrderItem = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitSellingPrice: number;
  unitPurchasePrice: number;
  subtotal: number;
};

export type OrderSource =
  'FACEBOOK' | 'MESSENGER' | 'INSTAGRAM' | 'WHATSAPP' | 'TIKTOK' | 'APPEL' | 'BOUTIQUE' | 'AUTRE';

export type OrderDelivery = {
  /** Area / landmark, e.g. "Analakely". */
  place: string | null;
  address: string | null;
  /** Extra instructions for the delivery person. */
  note: string | null;
};

export type Order = {
  id: string;
  status: OrderStatus;
  source: OrderSource | null;
  /** Planned delivery / hand-over day (YYYY-MM-DD). */
  scheduledDate: string;
  /** `phone` is the customer's main number. */
  customer: { id: string; name: string; phone: string | null } | null;
  /** null when the order is not delivered (pickup, hand delivery). */
  delivery: OrderDelivery | null;
  /** Sum of the lines (the sale, excluding delivery). */
  itemsAmount: number;
  deliveryFee: number;
  /** What the customer pays: itemsAmount + deliveryFee. */
  totalAmount: number;
  paymentMethod: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
};

export type OrderFilters = {
  /** today: planned today + overdue open orders; upcoming: planned later. */
  when?: 'today' | 'upcoming';
  status?: OrderStatus;
  customerId?: string;
};

export type CreateOrderInput = {
  customerId: string | null;
  /** New or returning customer (the API matches it by phone). */
  customer: { name: string; phone: string | null } | null;
  items: { productId: string; quantity: number }[];
  source: OrderSource | null;
  /** YYYY-MM-DD; null means today. */
  scheduledDate: string | null;
  /** null: not delivered, so no delivery fee. */
  delivery: (OrderDelivery & { fee: number }) | null;
  paymentMethod: string | null;
  status: 'EN_ATTENTE' | 'CONFIRMEE';
};

const base = (shopId: string) => `/shops/${shopId}/orders`;

export function listOrders(shopId: string, filters: OrderFilters): Promise<Order[]> {
  const params = new URLSearchParams({ limit: '100' });
  if (filters.when) params.set('when', filters.when);
  if (filters.status) params.set('status', filters.status);
  if (filters.customerId) params.set('customerId', filters.customerId);
  return apiFetch(`${base(shopId)}?${params}`);
}

export function getOrder(shopId: string, orderId: string): Promise<Order> {
  return apiFetch(`${base(shopId)}/${orderId}`);
}

export function createOrder(shopId: string, input: CreateOrderInput): Promise<Order> {
  return apiFetch(base(shopId), { method: 'POST', body: JSON.stringify(input) });
}

export function updateOrder(
  shopId: string,
  orderId: string,
  patch: { scheduledDate?: string },
): Promise<Order> {
  return apiFetch(`${base(shopId)}/${orderId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export function changeOrderStatus(
  shopId: string,
  orderId: string,
  status: OrderStatus,
): Promise<Order> {
  return apiFetch(`${base(shopId)}/${orderId}/status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
}
