import type { OrderStatus } from '@/components/ui';
import type { CustomerInput } from '@/features/customer/customer-api';
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

export type Order = {
  id: string;
  status: OrderStatus;
  customer: { id: string; name: string; phone: string | null } | null;
  /** Sum of the lines (the sale, excluding delivery). */
  itemsAmount: number;
  deliveryFee: number;
  /** What the customer pays: itemsAmount + deliveryFee. */
  totalAmount: number;
  paymentMethod: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
};

export type OrderFilters = {
  status?: OrderStatus;
  customerId?: string;
};

export type CreateOrderInput = {
  customerId: string | null;
  customer: CustomerInput | null;
  items: { productId: string; quantity: number }[];
  deliveryFee: number;
  paymentMethod: string | null;
  address: string | null;
  status: 'EN_ATTENTE' | 'CONFIRMEE';
};

const base = (shopId: string) => `/shops/${shopId}/orders`;

export function listOrders(shopId: string, filters: OrderFilters): Promise<Order[]> {
  const params = new URLSearchParams({ limit: '100' });
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
