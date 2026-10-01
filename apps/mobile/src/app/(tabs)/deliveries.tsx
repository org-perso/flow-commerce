import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react-native';
import { useState } from 'react';
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
  EmptyState,
  InlineBanner,
  PageTitle,
  Screen,
  ScreenHeader,
} from '@/components/ui';
import { DeliveryCard } from '@/features/order/delivery-card';
import type { Order } from '@/features/order/order-api';
import { isOverdue } from '@/features/order/order-row';
import { useDriverOrders } from '@/features/order/use-orders';
import { apiErrorMessage } from '@/lib/api-client';
import { theme } from '@/theme';
import { businessToday } from '@/utils/format';

const OVERDUE = 'En retard';
const DONE = 'Terminées';

const isDone = (o: Order) =>
  o.status === 'ANNULEE' || o.status === 'RETOUR' || (o.status === 'LIVREE' && o.isPaid);

type Section = { title: string; data: Order[]; count: number };

function toSections(orders: Order[], doneOpen: boolean): Section[] {
  const today = businessToday();
  const groups: Record<string, Order[]> = { [OVERDUE]: [], "Aujourd'hui": [], 'À venir': [] };
  const done: Order[] = [];
  for (const order of orders) {
    if (isDone(order)) done.push(order);
    else if (isOverdue(order, today)) groups[OVERDUE]!.push(order);
    else if (order.scheduledDate <= today) groups["Aujourd'hui"]!.push(order);
    else groups['À venir']!.push(order);
  }
  const sections = Object.entries(groups)
    .filter(([, data]) => data.length > 0)
    .map(([title, data]) => ({
      title,
      data: [...data].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate)),
      count: data.length,
    }));
  if (done.length) sections.push({ title: DONE, data: doneOpen ? done : [], count: done.length });
  return sections;
}

/** Driver home (F-13): my deliveries, overdue first. */
export default function DeliveriesScreen() {
  const orders = useDriverOrders('mine');
  const [doneOpen, setDoneOpen] = useState(false);
  const sections = toSections(orders.items, doneOpen);

  return (
    <Screen scroll={false} header={<ScreenHeader />}>
      <PageTitle
        title="Mes livraisons"
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
      <SectionList
        sections={sections}
        keyExtractor={(o) => o.id}
        renderItem={({ item }) => <DeliveryCard order={item} />}
        renderSectionHeader={({ section }) =>
          section.title === DONE ? (
            <Pressable
              onPress={() => setDoneOpen((v) => !v)}
              accessibilityRole="button"
              accessibilityState={{ expanded: doneOpen }}
              style={styles.doneHeader}
            >
              <AppText variant="caption" color="inkMuted" style={styles.strong}>
                {`${DONE.toUpperCase()} · ${section.count}`}
              </AppText>
              {doneOpen ? (
                <ChevronUp size={theme.layout.iconSm} color={theme.colors.inkMuted} />
              ) : (
                <ChevronDown size={theme.layout.iconSm} color={theme.colors.inkMuted} />
              )}
            </Pressable>
          ) : (
            <AppText
              variant="caption"
              color={section.title === OVERDUE ? 'statusCancelledFg' : 'inkMuted'}
              style={[styles.strong, styles.sectionTitle]}
            >
              {`${section.title.toUpperCase()} · ${section.count}`}
            </AppText>
          )
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
        refreshControl={
          <RefreshControl refreshing={orders.isRefetching} onRefresh={() => orders.refetch()} />
        }
        ListEmptyComponent={
          orders.isPending ? (
            <ActivityIndicator color={theme.colors.ink} style={styles.loader} />
          ) : (
            <EmptyState message="Aucune livraison pour vous. Regardez l’onglet « À prendre »." />
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
    marginTop: -theme.spacing[3],
  },
  strong: {
    fontFamily: theme.typography.heading.fontFamily,
  },
  sectionTitle: {
    paddingTop: theme.spacing[3],
    paddingBottom: theme.spacing[2],
  },
  doneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1],
    minHeight: theme.sizes.tapMin,
    paddingTop: theme.spacing[2],
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
