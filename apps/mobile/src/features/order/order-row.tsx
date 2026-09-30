import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, StatusBadge } from '@/components/ui';
import { theme } from '@/theme';
import { businessToday, formatAr, formatDateTime, formatDayLabel } from '@/utils/format';

import type { Order } from './order-api';
import { OPEN_STATUSES } from './order-status';

/** "Savon coco × 2, Thé × 3" */
export function itemsSummary(order: Order): string {
  return order.items.map((i) => `${i.productName} × ${i.quantity}`).join(', ');
}

/** Planned before today and not handled yet. */
export function isOverdue(order: Order, today = businessToday()): boolean {
  return order.scheduledDate < today && OPEN_STATUSES.includes(order.status);
}

type OrderRowProps = {
  order: Order;
  onPress: () => void;
  /** Hide the customer name (e.g. inside a customer's page). */
  hideCustomer?: boolean;
};

export function OrderRow({ order, onPress, hideCustomer }: OrderRowProps) {
  const today = businessToday();
  const overdue = isOverdue(order, today);
  const title = hideCustomer
    ? formatDateTime(order.createdAt)
    : (order.customer?.name ?? 'Client de passage');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.info}>
        <AppText style={styles.title} numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="caption" color="inkMuted" numberOfLines={1}>
          {itemsSummary(order)} · {formatAr(order.totalAmount)}
        </AppText>
        {(overdue || order.scheduledDate !== today) && (
          <AppText variant="caption" color={overdue ? 'statusCancelledFg' : 'inkMuted'}>
            {overdue ? 'En retard · ' : 'Prévue '}
            {formatDayLabel(order.scheduledDate, today).toLowerCase()}
          </AppText>
        )}
      </View>
      <StatusBadge status={order.status} size="sm" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    minHeight: theme.layout.rowMinHeight,
    padding: theme.spacing[3],
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.md,
  },
  info: {
    flex: 1,
    gap: theme.spacing[1] / 2,
  },
  title: {
    fontFamily: theme.typography.heading.fontFamily,
  },
  pressed: {
    opacity: theme.layout.pressedOpacity,
  },
});
