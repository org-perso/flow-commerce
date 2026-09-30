import { router } from 'expo-router';

import { Screen } from '@/components/ui';
import { CustomerForm } from '@/features/customer/customer-form';
import { useCreateCustomer } from '@/features/customer/use-customers';

export default function NewCustomerScreen() {
  const createCustomer = useCreateCustomer();

  return (
    <Screen edges={[]}>
      <CustomerForm
        submitLabel="Ajouter le client"
        error={createCustomer.error}
        onSubmit={async (values) => {
          const customer = await createCustomer.mutateAsync(values);
          router.replace(`/customers/${customer.id}`);
        }}
      />
    </Screen>
  );
}
