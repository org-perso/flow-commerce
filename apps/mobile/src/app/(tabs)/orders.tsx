import { router, useLocalSearchParams } from 'expo-router';
import { Plus, Receipt } from 'lucide-react-native';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import {
  AlertBanner,
  AppText,
  Button,
  EmptyState,
  FilterChips,
  Screen,
  type OrderStatus,
} from '@/components/ui';
import { OrderRow } from '@/features/order/order-row';
import { useOrders } from '@/features/order/use-orders';
import { apiErrorMessage } from '@/lib/api-client';
import { theme } from '@/theme';

const filters: readonly { value: OrderStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Toutes' },
  ...(Object.entries(theme.statusColors) as [OrderStatus, { label: string }][]).map(
    ([value, { label }]) => ({ value, label }),
  ),
];

export default function OrdersScreen() {
  // The filter lives in the URL, so the dashboard counters can open this tab pre-filtered.
  const params = useLocalSearchParams<{ status?: OrderStatus }>();
  const status = params.status ?? 'ALL';
  const setStatus = (value: OrderStatus | 'ALL') =>
    router.setParams({ status: value === 'ALL' ? undefined : value });
  const orders = useOrders(status === 'ALL' ? {} : { status });

  return (
    <Screen
      scroll={false}
      footer={
        <Button
          label="Nouvelle commande"
          icon={Plus}
          variant="primary"
          fullWidth
          onPress={() => router.push('/orders/new')}
        />
      }
    >
      <View style={styles.header}>
        <AppText variant="title">Commandes</AppText>
        <FilterChips options={filters} value={status} onChange={setStatus} />
      </View>

      {orders.isError && (
        <AlertBanner
          tone="danger"
          message={apiErrorMessage(orders.error)}
          onPress={() => orders.refetch()}
        />
      )}

      <FlatList
        data={orders.data ?? []}
        keyExtractor={(o) => o.id}
        renderItem={({ item }) => (
          <OrderRow order={item} onPress={() => router.push(`/orders/${item.id}`)} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl refreshing={orders.isRefetching} onRefresh={() => orders.refetch()} />
        }
        ListEmptyComponent={
          orders.isPending ? (
            <ActivityIndicator color={theme.colors.ink} style={styles.loader} />
          ) : (
            <EmptyState
              icon={Receipt}
              title={status === 'ALL' ? 'Aucune commande pour l’instant' : 'Aucune commande'}
              message={
                status === 'ALL' ? 'Créez votre première commande en quelques secondes.' : undefined
              }
            />
          )
        }
        style={styles.list}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: theme.spacing[3],
  },
  list: {
    flex: 1,
    marginTop: -theme.spacing[3],
  },
  separator: {
    height: theme.spacing[2],
  },
  loader: {
    marginTop: theme.spacing[8],
  },
});
