import { ArrowRight, MapPin, Phone, Store, Wallet } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, StatusBadge } from '@/components/ui';
import { callPhone, formatPhone } from '@/features/customer/contact';
import { hitSlopFor, theme } from '@/theme';
import { businessToday, formatAr, formatDateTime, formatDayLabel } from '@/utils/format';

import type { Order } from './order-api';
import { destructiveStatuses, OPEN_STATUSES, quickActionLabels, TRANSITIONS } from './order-status';
import { PaymentBadge } from './payment-badge';
import { useChangeOrderStatus, useUpdateOrder } from './use-orders';

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
  /** Next step and "Encaisser" buttons under the card (overdue orders). */
  showActions?: boolean;
  /** Planned day after the place, when not today; off where section titles give it. */
  showDate?: boolean;
};

export function OrderRow({
  order,
  onPress,
  hideCustomer,
  showActions,
  showDate = true,
}: OrderRowProps) {
  const today = businessToday();
  const overdue = isOverdue(order, today);
  const phone = hideCustomer ? null : order.customer?.phone;
  const place = order.delivery
    ? (order.delivery.place ?? order.delivery.address ?? 'À livrer')
    : 'Retrait';
  const title = hideCustomer
    ? formatDateTime(order.createdAt)
    : (order.customer?.name ?? 'Client de passage');
  const date =
    overdue || order.scheduledDate !== today
      ? formatDayLabel(order.scheduledDate, today).toLowerCase()
      : null;

  return (
    <View style={styles.card}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
      >
        <View style={styles.flex}>
          <View style={styles.line}>
            <AppText style={[styles.flex, styles.strong]} numberOfLines={1}>
              {title}
            </AppText>
            <AppText style={styles.total}>{formatAr(order.totalAmount)}</AppText>
          </View>
          <View style={styles.line}>
            <View style={styles.place}>
              {order.delivery ? (
                <MapPin size={theme.layout.iconSm} color={theme.colors.inkMuted} strokeWidth={2} />
              ) : (
                <Store size={theme.layout.iconSm} color={theme.colors.inkMuted} strokeWidth={2} />
              )}
              <AppText variant="caption" color="inkMuted" numberOfLines={1} style={styles.flex}>
                {place}
                {showDate && date ? ` · ${date}` : ''}
              </AppText>
            </View>
            <StatusBadge status={order.status} size="sm" />
            <PaymentBadge isPaid={order.isPaid} />
          </View>
        </View>
        {phone && (
          <Pressable
            onPress={() => callPhone(phone)}
            accessibilityRole="button"
            accessibilityLabel={`Appeler ${formatPhone(phone)}`}
            hitSlop={hitSlopFor(theme.layout.controlHeight)}
            style={({ pressed }) => [styles.phone, pressed && styles.pressed]}
          >
            <Phone size={theme.layout.iconSm} color={theme.colors.blue} strokeWidth={2} />
          </Pressable>
        )}
      </Pressable>
      {showActions && <QuickActions order={order} />}
    </View>
  );
}

/** Usual next step (dark) and "Encaisser" when unpaid, right on the card. */
function QuickActions({ order }: { order: Order }) {
  const changeStatus = useChangeOrderStatus(order.id);
  const updateOrder = useUpdateOrder(order.id);
  const next = TRANSITIONS[order.status].find((s) => !destructiveStatuses.includes(s));
  const nextLabel = next && quickActionLabels[next];
  if (!nextLabel && order.isPaid) return null;

  return (
    <View style={[styles.line, styles.actions]}>
      {next && nextLabel && (
        <View style={styles.flex}>
          <Button
            label={nextLabel}
            icon={next === 'LIVREE' ? undefined : ArrowRight}
            variant="dark"
            compact
            fullWidth
            loading={changeStatus.isPending}
            onPress={() => changeStatus.mutate(next)}
          />
        </View>
      )}
      {!order.isPaid && (
        <View style={styles.flex}>
          <Button
            label="Encaisser"
            icon={Wallet}
            compact
            fullWidth
            loading={updateOrder.isPending}
            onPress={() => updateOrder.mutate({ isPaid: true })}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.md,
    borderWidth: theme.layout.border,
    borderColor: theme.colors.line,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    minHeight: theme.layout.rowMinHeight,
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    minHeight: theme.spacing[6],
  },
  actions: {
    gap: theme.spacing[3],
    marginHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[3],
    borderTopWidth: theme.layout.border,
    borderTopColor: theme.colors.line,
  },
  phone: {
    width: theme.layout.controlHeight,
    height: theme.layout.controlHeight,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.navySoft,
  },
  place: {
    flex: 1,
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
  total: {
    fontFamily: theme.typography.heading.fontFamily,
    fontVariant: ['tabular-nums'],
  },
  pressed: {
    opacity: theme.layout.pressedOpacity,
  },
});
