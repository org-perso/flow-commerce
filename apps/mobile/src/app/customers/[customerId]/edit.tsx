import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator } from 'react-native';

import { Screen } from '@/components/ui';
import { CustomerForm } from '@/features/customer/customer-form';
import { useCustomer, useUpdateCustomer } from '@/features/customer/use-customers';
import { theme } from '@/theme';

export default function EditCustomerScreen() {
  const { customerId } = useLocalSearchParams<{ customerId: string }>();
  const customer = useCustomer(customerId);
  const updateCustomer = useUpdateCustomer(customerId);

  return (
    <Screen edges={[]}>
      {customer.data ? (
        <CustomerForm
          customer={customer.data}
          submitLabel="Enregistrer"
          error={updateCustomer.error}
          onSubmit={async (values) => {
            await updateCustomer.mutateAsync(values);
            router.back();
          }}
        />
      ) : (
        <ActivityIndicator color={theme.colors.ink} />
      )}
    </Screen>
  );
}
