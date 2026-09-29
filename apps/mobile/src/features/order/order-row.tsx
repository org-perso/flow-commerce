import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, StatusBadge } from '@/components/ui';
import { theme } from '@/theme';
import { formatAr, formatDateTime } from '@/utils/format';

import type { Order } from './order-api';

/** "Savon coco × 2, Thé × 3" */
export function itemsSummary(order: Order): string {
  return order.items.map((i) => `${i.productName} × ${i.quantity}`).join(', ');
}

type OrderRowProps = {
  order: Order;
  onPress: () => void;
  /** Hide the customer name (e.g. inside a customer's page). */
  hideCustomer?: boolean;
};

export function OrderRow({ order, onPress, hideCustomer }: OrderRowProps) {
  const title = hideCustomer
    ? formatDateTime(order.createdAt)
    : (order.customer?.name ?? 'Client non renseigné');

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
    minHeight: theme.sizes.tapMin + theme.spacing[4],
    padding: theme.spacing[3],
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.md,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: theme.typography.heading.fontFamily,
  },
  pressed: {
    opacity: 0.85,
  },
});
