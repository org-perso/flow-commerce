import { useLocalSearchParams } from 'expo-router';

import { OrderForm } from '@/features/order/order-form';

export default function NewOrderScreen() {
  // Opened from a customer's page: that customer is preselected.
  const { customerId } = useLocalSearchParams<{ customerId?: string }>();
  return <OrderForm customerId={customerId} />;
}
