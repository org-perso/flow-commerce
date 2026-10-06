import { router, useLocalSearchParams } from 'expo-router';
import { Bike, CalendarDays, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react-native';
import { useCallback, useDeferredValue, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  View,
} from 'react-native';

import {
  AppText,
  Dropdown,
  EmptyState,
  FilterChips,
  InlineBanner,
  PageTitle,
  Screen,
  ScreenHeader,
  SearchBar,
  type OrderStatus,
} from '@/components/ui';
import type { Order } from '@/features/order/order-api';
import { NotifyDriversButton } from '@/features/order/notify-drivers-button';
import { isOverdue, OrderRow } from '@/features/order/order-row';
import { useDrivers, useLiveRefresh, useOrderCounts, useOrders } from '@/features/order/use-orders';
import { apiErrorMessage } from '@/lib/api-client';
import { NewOrderFab } from '@/features/order/new-order-fab';
import { theme } from '@/theme';
import { businessToday, formatDayLabel } from '@/utils/format';

type When = 'today' | 'upcoming' | 'all';

const whenOptions = [
  { value: 'today', label: "Aujourd'hui" },
  { value: 'upcoming', label: 'À venir' },
  { value: 'all', label: 'Toutes les dates' },
] as const;

/** Chip labels (plural), in workflow order. */
const statusChips: { value: OrderStatus; label: string }[] = [
  { value: 'EN_ATTENTE', label: 'En attente' },
  { value: 'CONFIRMEE', label: 'Confirmées' },
  { value: 'EN_PREPARATION', label: 'En préparation' },
  { value: 'EN_LIVRAISON', label: 'En livraison' },
  { value: 'LIVREE', label: 'Livrées' },
  { value: 'ANNULEE', label: 'Annulées' },
  { value: 'RETOUR', label: 'Retours' },
];

const OVERDUE = 'En retard';
const DONE = 'Terminées';

/** Nothing left to do: delivered and paid, cancelled or returned. */
const isDone = (o: Order) =>
  o.status === 'ANNULEE' || o.status === 'RETOUR' || (o.status === 'LIVREE' && o.isPaid);

type Section = { title: string; data: Order[]; count: number };

/**
 * Sections: overdue then per planned day; one flat list for "all dates".
 * With `foldDone`, finished orders go to a last "Terminées" section, folded unless `doneOpen`.
 */
function toSections(orders: Order[], when: When, foldDone: boolean, doneOpen: boolean) {
  if (when === 'all')
    return orders.length ? [{ title: '', data: orders, count: orders.length }] : [];
  const today = businessToday();
  const sections: Section[] = [];
  const done: Order[] = [];
  for (const order of orders) {
    if (foldDone && isDone(order)) {
      done.push(order);
      continue;
    }
    const title = isOverdue(order, today) ? OVERDUE : formatDayLabel(order.scheduledDate, today);
    const last = sections.at(-1);
    if (last?.title === title) {
      last.data.push(order);
      last.count += 1;
    } else sections.push({ title, data: [order], count: 1 });
  }
  if (done.length) sections.push({ title: DONE, data: doneOpen ? done : [], count: done.length });
  return sections;
}

const emptyMessages: Record<When, string> = {
  today: 'Rien de prévu aujourd’hui.',
  upcoming: 'Aucune commande à venir.',
  all: 'Aucune commande pour l’instant.',
};

export default function OrdersScreen() {
  // Filters live in the URL, so the dashboard and the header search can open this tab.
  const params = useLocalSearchParams<{
    when?: When;
    status?: OrderStatus;
    search?: string;
    driver?: string;
  }>();
  const when = params.when ?? 'today';
  const status = params.status ?? 'ALL';
  const [search, setSearch] = useState('');
  const q = useDeferredValue(search.trim()) || undefined;

  const driverId = params.driver;
  const drivers = useDrivers();
  const filters = { when: when === 'all' ? undefined : when, q, driverId };
  const orders = useOrders({ ...filters, status: status === 'ALL' ? undefined : status });
  const counts = useOrderCounts(filters);
  // Other members (CM, drivers) change orders too: keep the list fresh.
  const { refetch: refetchOrders } = orders;
  const { refetch: refetchCounts } = counts;
  const refresh = useCallback(() => {
    refetchOrders();
    refetchCounts();
  }, [refetchOrders, refetchCounts]);
  useLiveRefresh(refresh);
  const [doneOpen, setDoneOpen] = useState(false);
  // With a status filter, the seller asked for those orders: nothing is folded.
  const sections = toSections(orders.items, when, status === 'ALL', doneOpen);
  const hasOrders = sections.some((sec) => sec.count > 0);

  const chips = [
    { value: 'ALL' as const, label: 'Toutes', count: counts.data?.total },
    ...statusChips
      // Final statuses only show up when there are some, to keep the row short.
      .filter(
        (c) =>
          !['ANNULEE', 'RETOUR'].includes(c.value) ||
          (counts.data?.byStatus[c.value] ?? 0) > 0 ||
          c.value === status,
      )
      .map((c) => ({
        ...c,
        count: counts.data ? (counts.data.byStatus[c.value] ?? 0) : undefined,
      })),
  ];

  return (
    <Screen scroll={false} header={<ScreenHeader />}>
      <PageTitle
        action={{
          label: orders.isFetching ? '…' : 'Actualiser',
          icon: RefreshCw,
          onPress: refresh,
        }}
        right={
          <Dropdown
            title="Livrer le"
            icon={CalendarDays}
            options={whenOptions}
            value={when}
            onChange={(value) => router.setParams({ when: value })}
          />
        }
      />
      <View style={styles.controls}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Client, lieu, téléphone ou produit"
          autoFocus={params.search === '1'}
        />
        {/* By driver: only once the shop has drivers. */}
        {!!drivers.data?.length && (
          <Dropdown
            title="Livreur"
            icon={Bike}
            options={[
              { value: 'all', label: 'Tous les livreurs' },
              { value: 'none', label: 'Sans livreur (à prendre)' },
              ...drivers.data.map((d) => ({ value: d.userId, label: d.name })),
            ]}
            value={driverId ?? 'all'}
            onChange={(value) => router.setParams({ driver: value === 'all' ? undefined : value })}
          />
        )}
        <FilterChips
          options={chips}
          value={status}
          onChange={(value) => router.setParams({ status: value === 'ALL' ? undefined : value })}
        />
      </View>

      <NotifyDriversButton />

      {orders.isError && (
        <InlineBanner
          tone="danger"
          message={apiErrorMessage(orders.error)}
          action={{ label: 'Réessayer', onPress: () => orders.refetch() }}
        />
      )}

      <SectionList
        sections={hasOrders ? sections : []}
        keyExtractor={(o) => o.id}
        renderItem={({ item, section }) => (
          <OrderRow
            order={item}
            showActions={section.title === OVERDUE}
            showDate={when === 'all' || section.title === OVERDUE || section.title === DONE}
            onPress={() => router.push(`/orders/${item.id}`)}
          />
        )}
        renderSectionHeader={({ section }) =>
          section.title === DONE ? (
            <Pressable
              onPress={() => setDoneOpen((v) => !v)}
              accessibilityRole="button"
              accessibilityState={{ expanded: doneOpen }}
              style={({ pressed }) => [styles.doneHeader, pressed && styles.pressed]}
            >
              <AppText variant="caption" color="inkMuted" style={styles.sectionTitleText}>
                {`${DONE.toUpperCase()} · ${section.count}`}
              </AppText>
              {doneOpen ? (
                <ChevronUp
                  size={theme.layout.iconSm}
                  color={theme.colors.inkMuted}
                  strokeWidth={2}
                />
              ) : (
                <ChevronDown
                  size={theme.layout.iconSm}
                  color={theme.colors.inkMuted}
                  strokeWidth={2}
                />
              )}
            </Pressable>
          ) : section.title ? (
            <AppText
              variant="caption"
              color={section.title === OVERDUE ? 'statusCancelledFg' : 'inkMuted'}
              style={styles.sectionTitle}
            >
              {`${section.title.toUpperCase()} · ${section.count}`}
            </AppText>
          ) : null
        }
        stickySectionHeadersEnabled={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        onEndReached={orders.loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          orders.isFetchingNextPage ? (
            <ActivityIndicator color={theme.colors.ink} style={styles.more} />
          ) : null
        }
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={orders.isRefetching}
            onRefresh={() => {
              orders.refetch();
              counts.refetch();
            }}
          />
        }
        ListEmptyComponent={
          orders.isPending ? (
            <ActivityIndicator color={theme.colors.ink} style={styles.loader} />
          ) : (
            <EmptyState
              message={
                q
                  ? 'Aucune commande ne correspond à la recherche.'
                  : status === 'ALL'
                    ? emptyMessages[when]
                    : 'Aucune commande avec ce statut.'
              }
            />
          )
        }
        style={styles.list}
      />
      <NewOrderFab />
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: {
    gap: theme.spacing[3],
  },
  list: {
    flex: 1,
    marginTop: -theme.spacing[1],
  },
  sectionTitle: {
    fontFamily: theme.typography.heading.fontFamily,
    paddingTop: theme.spacing[3],
    paddingBottom: theme.spacing[2],
  },
  sectionTitleText: {
    fontFamily: theme.typography.heading.fontFamily,
  },
  doneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1],
    minHeight: theme.sizes.tapMin,
    paddingTop: theme.spacing[2],
  },
  pressed: {
    opacity: theme.layout.pressedOpacity,
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
