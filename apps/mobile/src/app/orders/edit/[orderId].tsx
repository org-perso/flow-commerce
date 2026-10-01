import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator } from 'react-native';

import { AlertBanner, Screen } from '@/components/ui';
import { OrderForm } from '@/features/order/order-form';
import { useOrder } from '@/features/order/use-orders';
import { apiErrorMessage } from '@/lib/api-client';
import { theme } from '@/theme';

/** Edits an order: customer, delivery, date, payment, source; lines while pending (RG-24). */
export default function EditOrderScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const order = useOrder(orderId);

  if (!order.data) {
    return (
      <Screen edges={[]}>
        {order.isError ? (
          <AlertBanner tone="danger" message={apiErrorMessage(order.error)} />
        ) : (
          <ActivityIndicator color={theme.colors.ink} />
        )}
      </Screen>
    );
  }
  return <OrderForm order={order.data} />;
}
