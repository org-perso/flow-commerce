import { apiFetch } from '@/lib/api-client';

export type Customer = {
  id: string;
  name: string;
  /** Normalized by the API: "0341234567". */
  phone: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CustomerInput = {
  name: string;
  phone: string | null;
  address: string | null;
};

const base = (shopId: string) => `/shops/${shopId}/customers`;

export function listCustomers(shopId: string, q?: string): Promise<Customer[]> {
  return apiFetch(`${base(shopId)}${q ? `?q=${encodeURIComponent(q)}` : ''}`);
}

export function getCustomer(shopId: string, customerId: string): Promise<Customer> {
  return apiFetch(`${base(shopId)}/${customerId}`);
}

export function createCustomer(shopId: string, input: CustomerInput): Promise<Customer> {
  return apiFetch(base(shopId), { method: 'POST', body: JSON.stringify(input) });
}

export function updateCustomer(
  shopId: string,
  customerId: string,
  input: Partial<CustomerInput>,
): Promise<Customer> {
  return apiFetch(`${base(shopId)}/${customerId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteCustomer(shopId: string, customerId: string): Promise<void> {
  return apiFetch(`${base(shopId)}/${customerId}`, { method: 'DELETE' });
}
