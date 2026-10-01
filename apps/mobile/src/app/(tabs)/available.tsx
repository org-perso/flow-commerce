import { RefreshCw } from 'lucide-react-native';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { EmptyState, InlineBanner, PageTitle, Screen, ScreenHeader } from '@/components/ui';
import { DeliveryCard } from '@/features/order/delivery-card';
import { useDriverOrders } from '@/features/order/use-orders';
import { apiErrorMessage } from '@/lib/api-client';
import { theme } from '@/theme';

/** Deliveries nobody has taken yet (F-13): first come, first served (RG-55). */
export default function AvailableScreen() {
  const orders = useDriverOrders('available');
  const list = [...orders.items].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));

  return (
    <Screen scroll={false} header={<ScreenHeader />}>
      <PageTitle
        title="À prendre"
        action={{
          label: orders.isFetching ? 'Mise à jour…' : 'Actualiser',
          icon: RefreshCw,
          onPress: () => orders.refetch(),
        }}
      />
      {orders.isError && (
        <InlineBanner
          tone="danger"
          message={apiErrorMessage(orders.error)}
          action={{ label: 'Réessayer', onPress: () => orders.refetch() }}
        />
      )}
      <FlatList
        data={list}
        keyExtractor={(o) => o.id}
        renderItem={({ item }) => <DeliveryCard order={item} claimable />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        onEndReached={orders.loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          orders.isFetchingNextPage ? (
            <ActivityIndicator color={theme.colors.ink} style={styles.more} />
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={orders.isRefetching} onRefresh={() => orders.refetch()} />
        }
        ListEmptyComponent={
          orders.isPending ? (
            <ActivityIndicator color={theme.colors.ink} style={styles.loader} />
          ) : (
            <EmptyState message="Aucune livraison à prendre pour le moment." />
          )
        }
        style={styles.list}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  separator: {
    height: theme.spacing[2],
  },
  loader: {
    marginTop: theme.spacing[8],
  },
  more: {
    marginVertical: theme.spacing[4],
  },
});
