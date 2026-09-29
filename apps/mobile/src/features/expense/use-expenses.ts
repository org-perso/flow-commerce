import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useActiveShop } from '@/features/shop/use-shop';

import {
  createExpense,
  deleteExpense,
  getExpense,
  listExpenses,
  updateExpense,
  type ExpenseFilters,
  type ExpenseInput,
} from './expense-api';

const expensesKey = (shopId: string) => ['shops', shopId, 'expenses'] as const;

export function useExpenses(filters: ExpenseFilters) {
  const shopId = useActiveShop().id;
  return useQuery({
    queryKey: [...expensesKey(shopId), 'list', filters],
    queryFn: () => listExpenses(shopId, filters),
  });
}

export function useExpense(expenseId: string) {
  const shopId = useActiveShop().id;
  return useQuery({
    queryKey: [...expensesKey(shopId), 'detail', expenseId],
    queryFn: () => getExpense(shopId, expenseId),
  });
}

/** Expenses feed the dashboard profit: refresh all shop data afterwards. */
function useExpenseMutation<TVariables, TResult>(
  mutationFn: (shopId: string, variables: TVariables) => Promise<TResult>,
) {
  const shopId = useActiveShop().id;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: TVariables) => mutationFn(shopId, variables),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shops', shopId] }),
  });
}

export function useCreateExpense() {
  return useExpenseMutation((shopId, input: ExpenseInput) => createExpense(shopId, input));
}

export function useUpdateExpense(expenseId: string) {
  return useExpenseMutation((shopId, input: Partial<ExpenseInput>) =>
    updateExpense(shopId, expenseId, input),
  );
}

export function useDeleteExpense(expenseId: string) {
  return useExpenseMutation((shopId, _: void) => deleteExpense(shopId, expenseId));
}
