import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useActiveShop } from '@/features/shop/use-shop';

import {
  createCustomer,
  deleteCustomer,
  getCustomer,
  listCustomers,
  updateCustomer,
  type CustomerInput,
} from './customer-api';

const customersKey = (shopId: string) => ['shops', shopId, 'customers'] as const;

export function useCustomers(q?: string, { enabled = true } = {}) {
  const shopId = useActiveShop().id;
  return useQuery({
    queryKey: [...customersKey(shopId), 'list', q ?? ''],
    queryFn: () => listCustomers(shopId, q),
    enabled,
  });
}

export function useCustomer(customerId: string) {
  const shopId = useActiveShop().id;
  return useQuery({
    queryKey: [...customersKey(shopId), 'detail', customerId],
    queryFn: () => getCustomer(shopId, customerId),
  });
}

function useCustomerMutation<TVariables, TResult>(
  mutationFn: (shopId: string, variables: TVariables) => Promise<TResult>,
) {
  const shopId = useActiveShop().id;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: TVariables) => mutationFn(shopId, variables),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: customersKey(shopId) }),
  });
}

export function useCreateCustomer() {
  return useCustomerMutation((shopId, input: CustomerInput) => createCustomer(shopId, input));
}

export function useUpdateCustomer(customerId: string) {
  return useCustomerMutation((shopId, input: Partial<CustomerInput>) =>
    updateCustomer(shopId, customerId, input),
  );
}

export function useDeleteCustomer(customerId: string) {
  return useCustomerMutation((shopId, _: void) => deleteCustomer(shopId, customerId));
}
