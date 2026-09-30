import { MapPin } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, StatusBadge } from '@/components/ui';
import { formatPhone } from '@/features/customer/contact';
import { theme } from '@/theme';
import { businessToday, formatAr, formatDateTime, formatDayLabel } from '@/utils/format';

import type { Order } from './order-api';
import { OPEN_STATUSES } from './order-status';
import { PaymentBadge } from './payment-badge';

/** "2 × Savon coco, 3 × Thé" — no prices. */
export function itemsSummary(order: Order): string {
  return order.items.map((i) => `${i.quantity} × ${i.productName}`).join(', ');
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
  const customer = order.customer;
  const title = hideCustomer
    ? formatDateTime(order.createdAt)
    : (customer?.name ?? 'Client de passage');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.line}>
        <View style={styles.flex}>
          <AppText style={styles.strong} numberOfLines={1}>
            {title}
          </AppText>
          {!hideCustomer && customer?.phone && (
            <AppText variant="caption" color="inkMuted">
              {formatPhone(customer.phone)}
            </AppText>
          )}
        </View>
        <StatusBadge status={order.status} size="sm" />
      </View>

      <AppText numberOfLines={2}>{itemsSummary(order)}</AppText>

      <View style={styles.place}>
        <MapPin size={theme.layout.iconSm} color={theme.colors.inkMuted} strokeWidth={2} />
        <AppText variant="caption" color="inkMuted" style={styles.flex} numberOfLines={1}>
          {order.delivery
            ? (order.delivery.place ?? order.delivery.address ?? 'À livrer')
            : 'Sans livraison'}
        </AppText>
      </View>

      <View style={styles.line}>
        <AppText
          variant="caption"
          color={overdue ? 'statusCancelledFg' : 'inkMuted'}
          style={styles.flex}
          numberOfLines={1}
        >
          {overdue ? 'En retard · ' : ''}
          {formatDayLabel(order.scheduledDate, today)}
        </AppText>
        <PaymentBadge isPaid={order.isPaid} />
        <AppText style={[styles.strong, styles.amount]}>{formatAr(order.totalAmount)}</AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: theme.spacing[2],
    minHeight: theme.layout.rowMinHeight,
    padding: theme.spacing[3],
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.md,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
  },
  place: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1],
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
