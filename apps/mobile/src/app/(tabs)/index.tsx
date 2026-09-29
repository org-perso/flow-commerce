import { router } from 'expo-router';
import { ChevronRight, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import {
  AlertBanner,
  AppText,
  Button,
  FilterChips,
  KpiCard,
  Screen,
  type OrderStatus,
} from '@/components/ui';
import { EmailVerificationBanner } from '@/features/auth/email-verification-banner';
import type { DashboardPeriod } from '@/features/dashboard/dashboard-api';
import { useDashboard } from '@/features/dashboard/use-dashboard';
import { OrderRow } from '@/features/order/order-row';
import { useActiveShop } from '@/features/shop/use-shop';
import { apiErrorMessage } from '@/lib/api-client';
import { theme } from '@/theme';
import { formatAr } from '@/utils/format';

const periods = [
  { value: 'today', label: "Aujourd'hui" },
  { value: 'week', label: 'Cette semaine' },
  { value: 'month', label: 'Ce mois' },
] as const;

const revenueLabels: Record<DashboardPeriod, string> = {
  today: "CA aujourd'hui",
  week: 'CA cette semaine',
  month: 'CA ce mois',
};

const statusCounters: { status: OrderStatus; label: string }[] = [
  { status: 'EN_ATTENTE', label: 'En attente' },
  { status: 'EN_LIVRAISON', label: 'En livraison' },
  { status: 'LIVREE', label: 'Livrées' },
];

export default function DashboardScreen() {
  const shop = useActiveShop();
  const [period, setPeriod] = useState<DashboardPeriod>('today');
  const dashboard = useDashboard(period);
  const d = dashboard.data;

  const openOrders = (status: OrderStatus) =>
    router.navigate({ pathname: '/orders', params: { status } });

  return (
    <Screen
      onRefresh={() => dashboard.refetch()}
      refreshing={dashboard.isRefetching}
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
      <EmailVerificationBanner />

      <View style={styles.section}>
        <AppText variant="caption" color="inkMuted">
          Bonjour, {shop.name}
        </AppText>
        <FilterChips options={periods} value={period} onChange={setPeriod} />
      </View>

      {dashboard.isError && (
        <AlertBanner
          tone="danger"
          message={apiErrorMessage(dashboard.error)}
          onPress={() => dashboard.refetch()}
        />
      )}
      {dashboard.isPending && <ActivityIndicator color={theme.colors.ink} />}

      {d && (
        <>
          <View style={styles.section}>
            <KpiCard
              variant="hero"
              label={revenueLabels[period]}
              value={formatAr(d.revenue)}
              caption={`Bénéfice estimé · ${formatAr(d.estimatedProfit)}`}
            />
            <View style={styles.row}>
              {statusCounters.map(({ status, label }) => (
                <KpiCard
                  key={status}
                  label={label}
                  value={String(d.ordersByStatus[status] ?? 0)}
                  onPress={() => openOrders(status)}
                />
              ))}
            </View>
            {d.lowStockProducts.length > 0 && (
              <AlertBanner
                message={
                  d.lowStockProducts.length === 1
                    ? `« ${d.lowStockProducts[0]!.name} » a un stock faible`
                    : `${d.lowStockProducts.length} produits ont un stock faible`
                }
                onPress={() => router.navigate({ pathname: '/stock', params: { filter: 'low' } })}
              />
            )}
          </View>

          <View style={styles.section}>
            <AppText variant="heading">Détail du bénéfice</AppText>
            <View style={styles.card}>
              <Line
                label={`Chiffre d'affaires (${d.salesCount} vente${d.salesCount > 1 ? 's' : ''})`}
                value={d.revenue}
              />
              <Line label="Coût des produits vendus" value={-d.costOfGoodsSold} />
              <Line label="Dépenses" value={-d.expenses} onPress={() => router.push('/expenses')} />
              <Line label="Bénéfice estimé" value={d.estimatedProfit} strong />
            </View>
            <AppText variant="caption" color="inkMuted">
              Livraison exclue du CA. Les achats de produits ({formatAr(d.productPurchases)}) sont
              déjà comptés dans le coût des produits vendus.
            </AppText>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <AppText variant="heading">Dernières commandes</AppText>
              {d.recentOrders.length > 0 && (
                <Button
                  label="Voir tout"
                  variant="ghost"
                  onPress={() => router.navigate('/orders')}
                />
              )}
            </View>
            {d.recentOrders.length === 0 && (
              <AppText color="inkMuted">Aucune commande pour l’instant.</AppText>
            )}
            {d.recentOrders.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                onPress={() => router.push(`/orders/${order.id}`)}
              />
            ))}
          </View>
        </>
      )}
    </Screen>
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
      {onPress && <ChevronRight size={16} color={theme.colors.inkMuted} strokeWidth={2} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: theme.spacing[3],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing[3],
  },
  card: {
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[2],
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    minHeight: 40,
  },
  lineTotal: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.line,
    marginTop: theme.spacing[1],
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
    opacity: 0.85,
  },
});
