import { apiFetch } from "@/lib/api-client";
import { setPage, type Page } from "@/lib/paging";

export type Customer = {
  id: string;
  name: string;
  /** Normalized by the API ("0341234567"); the first one is the main number. */
  phones: string[];
  /** Facebook name, profile link, @handle… */
  socialProfile: string | null;
  /** Orders not cancelled nor returned, and their total. */
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CustomerInput = {
  name: string;
  phones: string[];
  socialProfile: string | null;
};

const base = (shopId: string) => `/shops/${shopId}/customers`;

export function listCustomers(
  shopId: string,
  q?: string,
  page?: Page,
): Promise<Customer[]> {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  setPage(params, page);
  const query = params.toString();
  return apiFetch(`${base(shopId)}${query ? `?${query}` : ""}`);
}

export function getCustomer(
  shopId: string,
  customerId: string,
): Promise<Customer> {
  return apiFetch(`${base(shopId)}/${customerId}`);
}

export function createCustomer(
  shopId: string,
  input: CustomerInput,
): Promise<Customer> {
  return apiFetch(base(shopId), {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateCustomer(
  shopId: string,
  customerId: string,
  input: Partial<CustomerInput>,
): Promise<Customer> {
  return apiFetch(`${base(shopId)}/${customerId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteCustomer(
  shopId: string,
  customerId: string,
): Promise<void> {
  return apiFetch(`${base(shopId)}/${customerId}`, { method: "DELETE" });
}

/** Live orders without a customer file. */
export function getUnlinkedOrdersCount(
  shopId: string,
): Promise<{ count: number }> {
  return apiFetch(`${base(shopId)}/unlinked-orders-count`);
}
