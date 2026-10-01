import type { OrderStatus } from '@/components/ui';
import { apiFetch } from '@/lib/api-client';
import { setPage, type Page } from '@/lib/paging';

import type { TimeSlot } from './time-slot';

export type OrderItem = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitSellingPrice: number;
  /** Absent for CM and drivers (RG-60). */
  unitPurchasePrice?: number;
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
  /** Per-shop number, shown as #001. */
  number: number;
  status: OrderStatus;
  source: OrderSource | null;
  /** Planned delivery / hand-over day (YYYY-MM-DD). */
  scheduledDate: string;
  /** Hours of the planned day; null: any time. */
  timeSlot: TimeSlot | null;
  /** Rank in the driver's round once they organise it (1, 2…); null: automatic order. */
  routePosition?: number | null;
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
  isPaid: boolean;
  paidAt: string | null;
  /** Delivery driver, when assigned. */
  driver: { userId: string; name: string | null } | null;
  createdAt: string;
  updatedAt: string;
  /** Absent for drivers (RG-61): they get the parcel number and amounts, not the content. */
  items?: OrderItem[];
};

/** "#042": the per-shop order number, written on the parcel. */
export const parcelNumber = (order: Pick<Order, 'number'>) =>
  `#${String(order.number).padStart(3, '0')}`;

/** "Colis #042". */
export const parcelLabel = (order: Pick<Order, 'number'>) => `Colis ${parcelNumber(order)}`;

export type OrderFilters = {
  /** today: planned today + overdue open orders; upcoming: planned later. */
  when?: 'today' | 'upcoming';
  /** Customer name or phone, order number or product. */
  q?: string;
  status?: OrderStatus;
  customerId?: string;
  /** mine: my deliveries (driver); available: deliveries nobody has taken yet. */
  assignment?: 'mine' | 'available';
};

export type CreateOrderInput = {
  customerId: string | null;
  /** New or returning customer (the API matches it by phone). */
  customer: { name: string; phone: string | null } | null;
  items: { productId: string; quantity: number }[];
  source: OrderSource | null;
  /** YYYY-MM-DD; null means today. */
  scheduledDate: string | null;
  timeSlot: TimeSlot | null;
  /** null: not delivered, so no delivery fee. */
  delivery: (OrderDelivery & { fee: number }) | null;
  paymentMethod: string | null;
  isPaid: boolean;
  status: 'EN_ATTENTE' | 'CONFIRMEE';
};

export type OrderPatch = Partial<{
  customerId: string | null;
  /** Only while the order is pending (RG-24). */
  items: { productId: string; quantity: number }[];
  source: OrderSource | null;
  scheduledDate: string;
  timeSlot: TimeSlot | null;
  delivery: (OrderDelivery & { fee: number }) | null;
  paymentMethod: string | null;
  isPaid: boolean;
}>;

const base = (shopId: string) => `/shops/${shopId}/orders`;

export function listOrders(shopId: string, filters: OrderFilters, page: Page): Promise<Order[]> {
  const params = new URLSearchParams();
  setPage(params, page);
  if (filters.when) params.set('when', filters.when);
  if (filters.q) params.set('q', filters.q);
  if (filters.status) params.set('status', filters.status);
  if (filters.customerId) params.set('customerId', filters.customerId);
  if (filters.assignment) params.set('assignment', filters.assignment);
  return apiFetch(`${base(shopId)}?${params}`);
}

export type OrderCounts = { total: number; byStatus: Partial<Record<OrderStatus, number>> };

/** Per-status counts with the same filters as the list (status excluded). */
export function getOrderCounts(
  shopId: string,
  filters: Omit<OrderFilters, 'status'>,
): Promise<OrderCounts> {
  const params = new URLSearchParams();
  if (filters.when) params.set('when', filters.when);
  if (filters.q) params.set('q', filters.q);
  if (filters.customerId) params.set('customerId', filters.customerId);
  return apiFetch(`${base(shopId)}/counts?${params}`);
}

export function getOrder(shopId: string, orderId: string): Promise<Order> {
  return apiFetch(`${base(shopId)}/${orderId}`);
}

export function createOrder(shopId: string, input: CreateOrderInput): Promise<Order> {
  return apiFetch(base(shopId), { method: 'POST', body: JSON.stringify(input) });
}

export function updateOrder(shopId: string, orderId: string, patch: OrderPatch): Promise<Order> {
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

export type Driver = { userId: string; name: string };

export function listDrivers(shopId: string): Promise<Driver[]> {
  return apiFetch(`/shops/${shopId}/drivers`);
}

export function assignDriver(shopId: string, orderId: string, userId: string): Promise<Order> {
  return apiFetch(`${base(shopId)}/${orderId}/driver`, {
    method: 'PUT',
    body: JSON.stringify({ userId }),
  });
}

export function unassignDriver(shopId: string, orderId: string): Promise<Order> {
  return apiFetch(`${base(shopId)}/${orderId}/driver`, { method: 'DELETE' });
}

/** A driver takes a delivery nobody has taken yet. */
export function claimDelivery(shopId: string, orderId: string): Promise<Order> {
  return apiFetch(`${base(shopId)}/${orderId}/claim`, { method: 'POST' });
}

/** A driver gives back one of their deliveries, until it is delivered. */
export function releaseDelivery(shopId: string, orderId: string): Promise<Order> {
  return apiFetch(`${base(shopId)}/${orderId}/release`, { method: 'POST' });
}

export type DeliveriesToNotify = { orders: number; drivers: number };

export function getDeliveriesToNotify(shopId: string): Promise<DeliveriesToNotify> {
  return apiFetch(`/shops/${shopId}/deliveries/to-notify`);
}

/** "Notifier les livreurs": one grouped notification per driver. */
export function notifyDrivers(shopId: string): Promise<DeliveriesToNotify> {
  return apiFetch(`/shops/${shopId}/deliveries/notify`, { method: 'POST' });
}

/** The driver's round, in order; an empty list goes back to the automatic order. */
export function setDriverRoute(shopId: string, orderIds: string[]): Promise<void> {
  return apiFetch(`/shops/${shopId}/deliveries/route`, {
    method: 'PUT',
    body: JSON.stringify({ orderIds }),
  });
}
