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

  if (!customer.data) {
    return (
      <Screen edges={[]}>
        <ActivityIndicator color={theme.colors.ink} />
      </Screen>
    );
  }

  return (
    <CustomerForm
      customer={customer.data}
      submitLabel="Enregistrer"
      error={updateCustomer.error}
      onSubmit={async (values) => {
        await updateCustomer.mutateAsync(values);
        router.back();
      }}
    />
  );
}
