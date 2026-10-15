import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator } from 'react-native';

import { Screen } from '@/components/ui';
import { OrderForm } from '@/features/order/order-form';
import { useOrder } from '@/features/order/use-orders';
import { theme } from '@/theme';

export default function NewOrderScreen() {
  // From a customer's page: that customer is preselected. From "Recommander": a copy of `from`.
  const { customerId, from } = useLocalSearchParams<{ customerId?: string; from?: string }>();
  const template = useOrder(from ?? '', !!from);
  if (from && !template.data) {
    return (
      <Screen edges={[]}>
        <ActivityIndicator color={theme.colors.ink} />
      </Screen>
    );
  }
  return <OrderForm customerId={customerId} template={template.data} />;
}
