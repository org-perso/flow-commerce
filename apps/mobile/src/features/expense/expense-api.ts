import { apiFetch } from '@/lib/api-client';
import { setPage, type Page } from '@/lib/paging';

export const EXPENSE_CATEGORIES = {
  ACHAT_PRODUITS: 'Achat de produits',
  PUBLICITE: 'Publicité',
  LIVRAISON: 'Livraison',
  EMBALLAGE: 'Emballage',
  TRANSPORT: 'Transport',
  AUTRE: 'Autre',
} as const;
export type ExpenseCategory = keyof typeof EXPENSE_CATEGORIES;

export type Expense = {
  id: string;
  category: ExpenseCategory;
  amount: number;
  description: string | null;
  /** YYYY-MM-DD */
  date: string;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseInput = {
  category: ExpenseCategory;
  amount: number;
  description: string | null;
  date: string;
};

export type ExpenseFilters = { from?: string; to?: string };

const base = (shopId: string) => `/shops/${shopId}/expenses`;

export function listExpenses(
  shopId: string,
  filters: ExpenseFilters,
  page?: Page,
): Promise<{ items: Expense[]; total: number }> {
  const params = new URLSearchParams();
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  setPage(params, page);
  const query = params.toString();
  return apiFetch(`${base(shopId)}${query ? `?${query}` : ''}`);
}

export function getExpense(shopId: string, expenseId: string): Promise<Expense> {
  return apiFetch(`${base(shopId)}/${expenseId}`);
}

export function createExpense(shopId: string, input: ExpenseInput): Promise<Expense> {
  return apiFetch(base(shopId), { method: 'POST', body: JSON.stringify(input) });
}

export function updateExpense(
  shopId: string,
  expenseId: string,
  input: Partial<ExpenseInput>,
): Promise<Expense> {
  return apiFetch(`${base(shopId)}/${expenseId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteExpense(shopId: string, expenseId: string): Promise<void> {
  return apiFetch(`${base(shopId)}/${expenseId}`, { method: 'DELETE' });
}
