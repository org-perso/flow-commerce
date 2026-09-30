import { router, useLocalSearchParams } from 'expo-router';
import { Plus } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ActivityIndicator, RefreshControl, SectionList, StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Dropdown,
  EmptyState,
  InlineBanner,
  Screen,
  ScreenHeader,
  SegmentedControl,
  type OrderStatus,
} from '@/components/ui';
import type { Order } from '@/features/order/order-api';
import { isOverdue, OrderRow } from '@/features/order/order-row';
import { useOrders } from '@/features/order/use-orders';
import { apiErrorMessage } from '@/lib/api-client';
import { theme } from '@/theme';
import { businessToday, formatDayLabel } from '@/utils/format';

type When = 'today' | 'upcoming' | 'all';

const statusOptions: { value: OrderStatus | 'ALL'; label: string; leading?: ReactNode }[] = [
  { value: 'ALL', label: 'Tous les statuts' },
  ...(Object.entries(theme.statusColors) as [OrderStatus, { label: string; fg: string }][]).map(
    ([value, { label, fg }]) => ({
      value,
      label,
      leading: <View style={[styles.dot, { backgroundColor: fg }]} />,
    }),
  ),
];

/** Sections: overdue then today; per planned day for upcoming; one flat list otherwise. */
function toSections(orders: Order[], when: When) {
  if (when === 'all') return orders.length ? [{ title: '', data: orders }] : [];
  const today = businessToday();
  const sections: { title: string; data: Order[] }[] = [];
  for (const order of orders) {
    const title = isOverdue(order, today)
      ? 'En retard'
      : formatDayLabel(order.scheduledDate, today);
    const last = sections.at(-1);
    if (last?.title === title) last.data.push(order);
    else sections.push({ title, data: [order] });
  }
  return sections;
}

const emptyMessages: Record<When, string> = {
  today: 'Rien de prévu aujourd’hui.',
  upcoming: 'Aucune commande à venir.',
  all: 'Aucune commande pour l’instant.',
};

export default function OrdersScreen() {
  // Filters live in the URL, so the dashboard counters can open this tab pre-filtered.
  const params = useLocalSearchParams<{ when?: When; status?: OrderStatus }>();
  const when = params.when ?? 'today';
  const status = params.status ?? 'ALL';

  const orders = useOrders({
    when: when === 'all' ? undefined : when,
    status: status === 'ALL' ? undefined : status,
  });
  const sections = toSections(orders.data ?? [], when);

  return (
    <Screen
      scroll={false}
      header={<ScreenHeader title="Commandes" />}
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
      <View style={styles.controls}>
        <SegmentedControl
          options={[
            { key: 'today', label: "Aujourd'hui" },
            { key: 'upcoming', label: 'À venir' },
            { key: 'all', label: 'Toutes' },
          ]}
          value={when}
          onChange={(value) => router.setParams({ when: value })}
        />
        <Dropdown
          title="Statut"
          options={statusOptions}
          value={status}
          onChange={(value) => router.setParams({ status: value === 'ALL' ? undefined : value })}
        />
      </View>

      {orders.isError && (
        <InlineBanner
          tone="danger"
          message={apiErrorMessage(orders.error)}
          action={{ label: 'Réessayer', onPress: () => orders.refetch() }}
        />
      )}

      <SectionList
        sections={sections}
        keyExtractor={(o) => o.id}
        renderItem={({ item }) => (
          <OrderRow order={item} onPress={() => router.push(`/orders/${item.id}`)} />
        )}
        renderSectionHeader={({ section }) =>
          section.title ? (
            <AppText
              variant="caption"
              color={section.title === 'En retard' ? 'statusCancelledFg' : 'inkMuted'}
              style={styles.sectionTitle}
            >
              {section.title.toUpperCase()}
            </AppText>
          ) : null
        }
        stickySectionHeadersEnabled={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl refreshing={orders.isRefetching} onRefresh={() => orders.refetch()} />
        }
        ListEmptyComponent={
          orders.isPending ? (
            <ActivityIndicator color={theme.colors.ink} style={styles.loader} />
          ) : (
            <EmptyState
              message={status === 'ALL' ? emptyMessages[when] : 'Aucune commande avec ce statut.'}
            />
          )
        }
        style={styles.list}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: {
    gap: theme.spacing[3],
  },
  list: {
    flex: 1,
    marginTop: -theme.spacing[3],
  },
  sectionTitle: {
    fontFamily: theme.typography.heading.fontFamily,
    paddingTop: theme.spacing[3],
    paddingBottom: theme.spacing[2],
  },
  separator: {
    height: theme.spacing[2],
  },
  dot: {
    width: theme.layout.dot * 2,
    height: theme.layout.dot * 2,
    borderRadius: theme.radius.pill,
  },
  loader: {
    marginTop: theme.spacing[8],
  },
});
