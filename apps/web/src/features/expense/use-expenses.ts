"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { useShopId } from "@/features/shop/shop-context";
import type { Page } from "@/lib/paging";

import {
  createExpense,
  deleteExpense,
  listExpenses,
  updateExpense,
  type ExpenseFilters,
  type ExpenseInput,
} from "./expense-api";

const expensesKey = (shopId: string) => ["shop", shopId, "expenses"] as const;

export function useExpenses(filters: ExpenseFilters, page: Page) {
  const shopId = useShopId();
  return useQuery({
    queryKey: [...expensesKey(shopId), "list", filters, page],
    queryFn: () => listExpenses(shopId, filters, page),
    placeholderData: keepPreviousData,
  });
}

function useExpensesChanged() {
  const queryClient = useQueryClient();
  const shopId = useShopId();
  return () => {
    void queryClient.invalidateQueries({ queryKey: expensesKey(shopId) });
    void queryClient.invalidateQueries({
      queryKey: ["shop", shopId, "dashboard"],
    });
  };
}

export function useCreateExpense() {
  const shopId = useShopId();
  const changed = useExpensesChanged();
  return useMutation({
    mutationFn: (input: ExpenseInput) => createExpense(shopId, input),
    onSuccess: changed,
  });
}

export function useUpdateExpense() {
  const shopId = useShopId();
  const changed = useExpensesChanged();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ExpenseInput> }) =>
      updateExpense(shopId, id, input),
    onSuccess: changed,
  });
}

export function useDeleteExpense() {
  const shopId = useShopId();
  const changed = useExpensesChanged();
  return useMutation({
    mutationFn: (id: string) => deleteExpense(shopId, id),
    onSuccess: changed,
  });
}
