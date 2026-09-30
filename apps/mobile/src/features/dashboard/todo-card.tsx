import { router } from 'expo-router';
import { ChevronRight, Clock, TriangleAlert, Wallet, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { theme } from '@/theme';
import { businessToday, formatAr, formatDayLabel } from '@/utils/format';

import type { Dashboard } from './dashboard-api';

type Tone = 'danger' | 'neutral' | 'warning';

const tones: Record<Tone, { bg: string; fg: string }> = {
  danger: { bg: theme.colors.statusCancelledBg, fg: theme.colors.statusCancelledFg },
  neutral: { bg: theme.colors.navySoft, fg: theme.colors.ink },
  warning: { bg: theme.colors.goldSoft, fg: theme.colors.goldInk },
};

type Item = {
  key: string;
  icon: LucideIcon;
  tone: Tone;
  title: string;
  subtitle: string;
  onPress: () => void;
};

/** What needs the seller now: overdue orders, money to collect, low stock. */
export function TodoCard({ dashboard: d }: { dashboard: Dashboard }) {
  const today = businessToday();
  const items: Item[] = [
    ...d.overdueOrders.map((o) => ({
      key: o.id,
      icon: Clock,
      tone: 'danger' as const,
      title: `${o.customer?.name ?? 'Client de passage'} : en retard depuis ${formatDayLabel(o.scheduledDate, today).toLowerCase()}`,
      subtitle: `${formatAr(o.totalAmount)}${o.delivery?.place ? ` · ${o.delivery.place}` : ''}`,
      onPress: () => router.push(`/orders/${o.id}`),
    })),
    ...(d.unpaid.count > 0
      ? [
          {
            key: 'unpaid',
            icon: Wallet,
            tone: 'neutral' as const,
            title: `${formatAr(d.unpaid.amount)} à encaisser`,
            subtitle: `${d.unpaid.count} commande${d.unpaid.count > 1 ? 's' : ''} non payée${d.unpaid.count > 1 ? 's' : ''}`,
            onPress: () => router.navigate({ pathname: '/orders', params: { when: 'all' } }),
          },
        ]
      : []),
    ...d.lowStockProducts.map((p) => ({
      key: p.id,
      icon: TriangleAlert,
      tone: 'warning' as const,
      title:
        p.stockQuantity === 0
          ? `${p.name} : rupture`
          : `${p.name} : ${p.stockQuantity} restant${p.stockQuantity > 1 ? 's' : ''}`,
      subtitle: 'Stock faible · réapprovisionner',
      onPress: () => router.push(`/products/${p.id}`),
    })),
  ];

  if (items.length === 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <AppText variant="heading" style={styles.flex}>
          À traiter
        </AppText>
        <View style={styles.count}>
          <AppText variant="caption" color="onNavy" style={styles.countText}>
            {items.length}
          </AppText>
        </View>
      </View>
      {items.map(({ key, icon: Icon, tone, title, subtitle, onPress }) => (
        <Pressable
          key={key}
          onPress={onPress}
          accessibilityRole="button"
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <View style={[styles.icon, { backgroundColor: tones[tone].bg }]}>
            <Icon size={theme.layout.iconMd} color={tones[tone].fg} strokeWidth={2} />
          </View>
          <View style={styles.flex}>
            <AppText style={styles.title} numberOfLines={1}>
              {title}
            </AppText>
            <AppText variant="caption" color="inkMuted" numberOfLines={1}>
              {subtitle}
            </AppText>
          </View>
          <ChevronRight size={theme.layout.iconMd} color={theme.colors.inkMuted} strokeWidth={2} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: theme.spacing[4],
    paddingTop: theme.spacing[3],
    borderRadius: theme.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.surfaceRaised,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: theme.spacing[2],
  },
  count: {
    minWidth: theme.spacing[6],
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1] / 2,
    alignItems: 'center',
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.navy,
  },
  countText: {
    fontFamily: theme.typography.heading.fontFamily,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    minHeight: theme.layout.rowMinHeight,
    paddingVertical: theme.spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.line,
  },
  icon: {
    width: theme.layout.avatar,
    height: theme.layout.avatar,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
  },
  title: {
    fontFamily: theme.typography.heading.fontFamily,
  },
  pressed: {
    opacity: theme.layout.pressedOpacity,
  },
});
