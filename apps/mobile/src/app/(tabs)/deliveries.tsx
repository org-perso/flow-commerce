import { router } from 'expo-router';
import { ChevronDown, ChevronUp, ListOrdered, RefreshCw } from 'lucide-react-native';
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
  Button,
  EmptyState,
  InlineBanner,
  PageTitle,
  Screen,
  ScreenHeader,
} from '@/components/ui';
import { DeliveryCard } from '@/features/order/delivery-card';
import type { Order } from '@/features/order/order-api';
import { roundSections, type RoundSection } from '@/features/order/round';
import { byPlannedTime } from '@/features/order/time-slot';
import { useDriverOrders } from '@/features/order/use-orders';
import { apiErrorMessage } from '@/lib/api-client';
import { theme } from '@/theme';
import { businessToday } from '@/utils/format';

const DONE = 'Terminées';

const isDone = (o: Order) =>
  o.status === 'ANNULEE' || o.status === 'RETOUR' || (o.status === 'LIVREE' && o.isPaid);

type Section = RoundSection & { count: number };

/** Today's round (see roundSections), then the coming days, then the finished ones (folded). */
function toSections(orders: Order[], today: string, doneOpen: boolean): Section[] {
  const current: Order[] = [];
  const coming: Order[] = [];
  const done: Order[] = [];
  for (const order of orders) {
    if (isDone(order)) done.push(order);
    else if (order.scheduledDate > today) coming.push(order);
    else current.push(order);
  }
  const sections: Section[] = roundSections(current, today).map((s) => ({
    ...s,
    count: s.data.length,
  }));
  if (coming.length) {
    sections.push({ title: 'À venir', data: coming.sort(byPlannedTime), count: coming.length });
  }
  if (done.length) sections.push({ title: DONE, data: doneOpen ? done : [], count: done.length });
  return sections;
}

/** Driver home (F-13): my deliveries, overdue first. */
export default function DeliveriesScreen() {
  const orders = useDriverOrders('mine');
  const [doneOpen, setDoneOpen] = useState(false);
  const today = businessToday();
  const sections = toSections(orders.items, today, doneOpen);
  const toOrganise = sections.filter((s) => s.title !== DONE && s.title !== 'À venir');
  const canOrganise = toOrganise.reduce((n, s) => n + s.count, 0) >= 2;

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
      {canOrganise && (
        <Button
          label="Organiser ma tournée"
          icon={ListOrdered}
          variant="secondary"
          fullWidth
          onPress={() => router.push('/round')}
        />
      )}
      <SectionList
        sections={sections}
        keyExtractor={(o) => o.id}
        renderItem={({ item, index, section }) => (
          <DeliveryCard order={item} rank={section.numbered ? index + 1 : undefined} />
        )}
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
              color={section.tone === 'danger' ? 'statusCancelledFg' : 'inkMuted'}
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
    marginTop: -theme.spacing[1],
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
