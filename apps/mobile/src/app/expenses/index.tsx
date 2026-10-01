import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import {
  AlertBanner,
  AppText,
  Button,
  EmptyState,
  FilterChips,
  KpiCard,
  Screen,
} from '@/components/ui';
import { EXPENSE_CATEGORIES } from '@/features/expense/expense-api';
import { usePagedExpenses } from '@/features/expense/use-expenses';
import { apiErrorMessage } from '@/lib/api-client';
import { theme } from '@/theme';
import { businessToday, formatAr, isoToFrDate, monthRange } from '@/utils/format';

type Period = 'month' | 'lastMonth' | 'all';

const periods = [
  { value: 'month', label: 'Ce mois' },
  { value: 'lastMonth', label: 'Mois dernier' },
  { value: 'all', label: 'Tout' },
] as const;

export default function ExpensesScreen() {
  const [period, setPeriod] = useState<Period>('month');
  const today = businessToday();
  const range = period === 'all' ? {} : monthRange(today, period === 'lastMonth' ? -1 : 0);
  const expenses = usePagedExpenses(range);

  return (
    <Screen
      edges={[]}
      scroll={false}
      footer={
        <Button
          label="Ajouter une dépense"
          icon={Plus}
          variant="primary"
          fullWidth
          onPress={() => router.push('/expenses/new')}
        />
      }
    >
      <View style={styles.header}>
        <FilterChips options={periods} value={period} onChange={setPeriod} />
        {/* No total card for an empty period: the empty message says it all. */}
        {!!expenses.items.length && expenses.firstPage && (
          <KpiCard label="Total des dépenses" value={formatAr(expenses.firstPage.total)} />
        )}
      </View>

      {expenses.isError && (
        <AlertBanner
          tone="danger"
          message={apiErrorMessage(expenses.error)}
          onPress={() => expenses.refetch()}
        />
      )}

      <FlatList
        data={expenses.items}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/expenses/${item.id}`)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View style={styles.info}>
              <AppText style={styles.strong}>{EXPENSE_CATEGORIES[item.category]}</AppText>
              <AppText variant="caption" color="inkMuted" numberOfLines={1}>
                {isoToFrDate(item.date)}
                {item.description ? ` · ${item.description}` : ''}
              </AppText>
            </View>
            <AppText style={styles.amount}>{formatAr(item.amount)}</AppText>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        onEndReached={expenses.loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          expenses.isFetchingNextPage ? (
            <ActivityIndicator color={theme.colors.ink} style={styles.more} />
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={expenses.isRefetching} onRefresh={() => expenses.refetch()} />
        }
        ListEmptyComponent={
          expenses.isPending ? (
            <ActivityIndicator color={theme.colors.ink} style={styles.loader} />
          ) : (
            <EmptyState message="Aucune dépense sur cette période." />
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    minHeight: theme.sizes.tapMin + theme.spacing[4],
    padding: theme.spacing[3],
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.md,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  strong: {
    fontFamily: theme.typography.heading.fontFamily,
  },
  amount: {
    fontFamily: theme.typography.heading.fontFamily,
    fontVariant: ['tabular-nums'],
  },
  separator: {
    height: theme.spacing[2],
  },
  loader: {
    marginTop: theme.spacing[8],
  },
  pressed: {
    opacity: 0.85,
  },
  more: {
    marginVertical: theme.spacing[4],
  },
});
