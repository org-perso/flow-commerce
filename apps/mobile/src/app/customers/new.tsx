import { router } from 'expo-router';

import { CustomerForm } from '@/features/customer/customer-form';
import { useCreateCustomer } from '@/features/customer/use-customers';

export default function NewCustomerScreen() {
  const createCustomer = useCreateCustomer();

  return (
    <CustomerForm
      submitLabel="Ajouter le client"
      error={createCustomer.error}
      onSubmit={async (values) => {
        const customer = await createCustomer.mutateAsync(values);
        router.replace(`/customers/${customer.id}`);
      }}
    />
  );
}
