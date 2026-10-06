import { Redirect, router } from 'expo-router';
import { ChevronDown, ChevronRight, ChevronUp } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import {
  AlertBanner,
  AppText,
  Screen,
  ScreenHeader,
  SegmentedControl,
  type OrderStatus,
} from '@/components/ui';
import type { Dashboard, DashboardPeriod } from '@/features/dashboard/dashboard-api';
import { GettingStarted } from '@/features/dashboard/getting-started';
import { RevenueCard } from '@/features/dashboard/revenue-card';
import { TodoCard } from '@/features/dashboard/todo-card';
import { useDashboard } from '@/features/dashboard/use-dashboard';
import { useExpenses } from '@/features/expense/use-expenses';
import { useProducts } from '@/features/product/use-products';
import { apiErrorMessage } from '@/lib/api-client';
import { useActiveShop } from '@/features/shop/use-shop';
import { theme } from '@/theme';
import { useStateColor } from '@/theme/state-colors';
import { formatAr } from '@/utils/format';

const periods = [
  { key: 'today', label: "Aujourd'hui" },
  { key: '7d', label: '7 jours' },
  { key: '30d', label: '30 jours' },
] as const;

const statusCounters: { status: OrderStatus; label: string }[] = [
  { status: 'EN_ATTENTE', label: 'En attente' },
  { status: 'CONFIRMEE', label: 'Confirmée' },
  { status: 'EN_LIVRAISON', label: 'En livraison' },
  { status: 'LIVREE', label: 'Livrée' },
];

/** The first tab: the dashboard, or the role's own start screen (CM, driver). */
export default function HomeTab() {
  const { role } = useActiveShop();
  if (role === 'CM') return <Redirect href="/orders" />;
  if (role === 'DRIVER') return <Redirect href="/deliveries" />;
  return <DashboardScreen />;
}

function DashboardScreen() {
  const [period, setPeriod] = useState<DashboardPeriod>('today');
  const dashboard = useDashboard(period);
  const d = dashboard.data;
  const products = useProducts({});
  const expenses = useExpenses({});

  const hasProducts = (products.data?.length ?? 0) > 0;
  const hasOrders = (d?.recentOrders.length ?? 0) > 0;
  const hasExpenses = (expenses.data?.items.length ?? 0) > 0;
  // Brand-new shop: only the first steps, no wall of zeros.
  const isEmptyShop = !!d && products.isSuccess && !hasProducts && !hasOrders;

  return (
    <Screen
      header={<ScreenHeader />}
      onRefresh={() => dashboard.refetch()}
      refreshing={dashboard.isRefetching}
    >
      {d && !hasOrders && (
        <GettingStarted hasProducts={hasProducts} hasOrders={hasOrders} hasExpenses={hasExpenses} />
      )}

      {!isEmptyShop && (
        <View style={styles.periods}>
          <SegmentedControl options={periods} value={period} onChange={setPeriod} />
        </View>
      )}

      {dashboard.isError && (
        <AlertBanner
          tone="danger"
          message={apiErrorMessage(dashboard.error)}
          onPress={() => dashboard.refetch()}
        />
      )}
      {dashboard.isPending && <ActivityIndicator color={theme.colors.ink} />}

      {d && !isEmptyShop && (
        <>
          <View style={styles.block}>
            <RevenueCard dashboard={d} />
            <View style={styles.counters}>
              {statusCounters.map(({ status, label }) => (
                <StatusCounter
                  key={status}
                  status={status}
                  label={label}
                  count={d.ordersByStatus[status] ?? 0}
                />
              ))}
            </View>
          </View>
          <TodoCard dashboard={d} />
          <ProfitDetail dashboard={d} />
        </>
      )}
    </Screen>
  );
}

function StatusCounter({
  status,
  label,
  count,
}: {
  status: OrderStatus;
  label: string;
  count: number;
}) {
  const color = useStateColor(status);
  return (
    <Pressable
      onPress={() => router.navigate({ pathname: '/orders', params: { status, when: 'all' } })}
      accessibilityRole="button"
      accessibilityLabel={`${count} ${label}`}
      style={({ pressed }) => [styles.counter, pressed && styles.pressed]}
    >
      <View style={[styles.dot, { backgroundColor: color.fg }]} />
      <AppText
        variant="label"
        color="inkMuted"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={theme.layout.minFontScale}
        style={styles.flex}
      >
        {label}
      </AppText>
      <AppText variant="heading" style={styles.counterValue}>
        {count}
      </AppText>
    </Pressable>
  );
}

/** One-line profit formula; a tap shows the detailed lines. */
function ProfitDetail({ dashboard: d }: { dashboard: Dashboard }) {
  const [open, setOpen] = useState(false);
  const Chevron = open ? ChevronUp : ChevronDown;
  return (
    <View style={styles.card}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [styles.detailHead, pressed && styles.pressed]}
      >
        <View style={styles.flex}>
          <AppText style={styles.strong}>Détail du bénéfice</AppText>
          <AppText variant="caption" color="inkMuted" numberOfLines={1}>
            CA {formatAr(d.revenue)} − coûts {formatAr(d.costOfGoodsSold)} − dépenses{' '}
            {formatAr(d.expenses)}
          </AppText>
        </View>
        <Chevron size={theme.layout.iconMd} color={theme.colors.inkMuted} strokeWidth={2} />
      </Pressable>
      {open && (
        <View style={styles.detail}>
          <Line
            label={`Chiffre d'affaires (${d.salesCount} vente${d.salesCount > 1 ? 's' : ''})`}
            value={d.revenue}
          />
          <Line label="Coût des produits vendus" value={-d.costOfGoodsSold} />
          <Line label="Dépenses" value={-d.expenses} onPress={() => router.push('/expenses')} />
          <Line label="Bénéfice estimé" value={d.estimatedProfit} strong />
          <AppText variant="caption" color="inkMuted">
            Livraison exclue du CA. Les achats de produits ({formatAr(d.productPurchases)}) sont
            déjà comptés dans le coût des produits vendus.
          </AppText>
        </View>
      )}
    </View>
  );
}

function Line({
  label,
  value,
  strong,
  onPress,
}: {
  label: string;
  value: number;
  strong?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.line, strong && styles.lineTotal, pressed && styles.pressed]}
    >
      <AppText color={strong ? 'ink' : 'inkMuted'} style={[styles.flex, strong && styles.strong]}>
        {label}
      </AppText>
      <AppText style={[styles.amount, strong && styles.strong]}>{formatAr(value)}</AppText>
      {onPress && (
        <ChevronRight size={theme.layout.iconSm} color={theme.colors.inkMuted} strokeWidth={2} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  periods: {
    alignSelf: 'flex-start',
    marginBottom: -theme.spacing[3],
  },
  block: {
    gap: theme.spacing[2],
  },
  // 2 × 2: label and count on one line each, wide enough to read.
  counters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[2],
  },
  counter: {
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
    borderRadius: theme.radius.md,
    borderWidth: theme.layout.border,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.surfaceRaised,
  },
  counterValue: {
    fontVariant: ['tabular-nums'],
  },
  dot: {
    width: theme.layout.dot,
    height: theme.layout.dot,
    borderRadius: theme.radius.pill,
  },
  card: {
    paddingHorizontal: theme.spacing[3],
    borderRadius: theme.radius.md,
    borderWidth: theme.layout.border,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.surfaceRaised,
  },
  detailHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    minHeight: theme.layout.rowMinHeight,
    paddingVertical: theme.spacing[2],
  },
  detail: {
    gap: theme.spacing[1],
    paddingBottom: theme.spacing[3],
    borderTopWidth: theme.layout.border,
    borderTopColor: theme.colors.line,
    paddingTop: theme.spacing[2],
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    minHeight: theme.sizes.tapMin - theme.spacing[2],
  },
  lineTotal: {
    borderTopWidth: theme.layout.border,
    borderTopColor: theme.colors.line,
  },
  flex: {
    flex: 1,
  },
  strong: {
    fontFamily: theme.typography.heading.fontFamily,
  },
  amount: {
    fontVariant: ['tabular-nums'],
  },
  pressed: {
    opacity: theme.layout.pressedOpacity,
  },
});
