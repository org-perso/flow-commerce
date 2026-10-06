import { Clock, MessageCircle, Package, Phone } from 'lucide-react-native';
import { useState } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, StatusBadge } from '@/components/ui';
import { callPhone, formatPhone, openWhatsApp } from '@/features/customer/contact';
import { hitSlopFor, textStyles, theme } from '@/theme';
import { useStateColor } from '@/theme/state-colors';
import { businessToday, formatAr, formatDayLabel } from '@/utils/format';

import { DriverActions } from './driver-actions';
import { parcelNumber, type Order } from './order-api';
import { isOverdue } from './order-row';
import { PaymentBadge } from './payment-badge';
import { slotRange } from './time-slot';

/**
 * A delivery for the driver (F-13), folded by default: parcel number, call button, status,
 * place and customer, amount to collect. A tap unfolds it in place (no separate page): full address and
 * notes, amounts, call buttons and every action (set off, delivered, collect, return,
 * give back). `claimable`: a delivery to take, its "Je la prends" button always visible.
 */
export function DeliveryCard({
  order,
  claimable,
  rank,
}: {
  order: Order;
  claimable?: boolean;
  /** Place in the driver's round, shown inside the card. */
  rank?: number;
}) {
  const [open, setOpen] = useState(false);
  const today = businessToday();
  const phone = order.customer?.phone ?? order.delivery?.phone;
  const place = order.delivery?.place ?? order.delivery?.address ?? 'À livrer';
  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  };
  const overdue = isOverdue(order, today);
  // Same colors as the order cards: status as background, payment as the left stripe.
  const statusColor = useStateColor(order.status);
  const paymentColor = useStateColor(order.isPaid ? 'PAID' : 'UNPAID');
  // Short, so it stays readable next to the badges: "8h–12h", or "Hier · Avant 11h".
  const when = [
    order.scheduledDate === today ? null : formatDayLabel(order.scheduledDate, today),
    slotRange(order.timeSlot) ?? (order.scheduledDate === today ? 'Aujourd’hui' : null),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={[styles.card, { backgroundColor: statusColor.bg }]}>
      <View style={[styles.stripe, { backgroundColor: paymentColor.fg }]} />
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
      >
        {/* Folded: laid out like the order cards, with the place first for the driver. */}
        <View style={styles.content}>
          <View style={styles.line}>
            {rank !== undefined && (
              <View style={styles.rank}>
                <AppText variant="caption" color="onNavy" style={styles.strong}>
                  {rank}
                </AppText>
              </View>
            )}
            <AppText style={[styles.flex, styles.strong]} numberOfLines={1}>
              {place}
            </AppText>
            <AppText style={styles.total}>{formatAr(order.totalAmount)}</AppText>
          </View>
          <View style={styles.line}>
            <View style={styles.when}>
              <Clock
                size={theme.layout.iconSm}
                color={overdue ? theme.colors.statusCancelledFg : theme.colors.inkMuted}
                strokeWidth={2}
              />
              <AppText
                variant="caption"
                color={overdue ? 'statusCancelledFg' : 'inkMuted'}
                numberOfLines={1}
                style={styles.flex}
              >
                {when}
              </AppText>
            </View>
            <StatusBadge status={order.status} size="sm" />
            <PaymentBadge isPaid={order.isPaid} />
          </View>
          <View style={styles.when}>
            <Package size={theme.layout.iconSm} color={theme.colors.blue} strokeWidth={2} />
            <AppText
              variant="caption"
              color="blue"
              numberOfLines={1}
              style={[styles.flex, styles.strong]}
            >
              {parcelNumber(order)} · {order.customer?.name ?? 'Client sans fiche'}
            </AppText>
          </View>
        </View>
        {/* Same call button as on the order cards. */}
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

      {open && (
        <View style={[styles.details, styles.below]}>
          {(order.delivery?.address || order.delivery?.note) && (
            <View style={styles.where}>
              {order.delivery?.address && <AppText>{order.delivery.address}</AppText>}
              {order.delivery?.note && (
                <AppText variant="caption" color="inkMuted">
                  {order.delivery.note}
                </AppText>
              )}
            </View>
          )}

          {/* Amounts only, never the content of the parcel (RG-61). */}
          <View style={styles.amounts}>
            <View style={styles.line}>
              <AppText variant="caption" color="inkMuted" style={styles.flex}>
                Articles
              </AppText>
              <AppText variant="caption" style={styles.figure}>
                {formatAr(order.itemsAmount)}
              </AppText>
            </View>
            <View style={styles.line}>
              <AppText variant="caption" color="inkMuted" style={styles.flex}>
                Frais de livraison
              </AppText>
              <AppText variant="caption" style={styles.figure}>
                {formatAr(order.deliveryFee)}
              </AppText>
            </View>
            <View style={[styles.line, styles.totalLine]}>
              <AppText
                style={[styles.flex, styles.strong]}
                color={order.isPaid ? 'statusDeliveredFg' : 'ink'}
              >
                {order.isPaid
                  ? `Payée${order.paymentMethod ? ` · ${order.paymentMethod}` : ''}`
                  : 'Non payée'}
              </AppText>
              <AppText style={styles.amount}>{formatAr(order.totalAmount)}</AppText>
            </View>
          </View>

          {phone && (
            <View style={styles.line}>
              <View style={styles.flex}>
                <Button
                  label="Appeler"
                  icon={Phone}
                  compact
                  fullWidth
                  onPress={() => callPhone(phone)}
                />
              </View>
              <View style={styles.flex}>
                <Button
                  label="WhatsApp"
                  icon={MessageCircle}
                  compact
                  fullWidth
                  onPress={() => openWhatsApp(phone)}
                />
              </View>
            </View>
          )}

          {!claimable && <DriverActions order={order} />}
        </View>
      )}

      {/* Taking a delivery is the one action that must stay one tap away. */}
      {claimable && (
        <View style={styles.below}>
          <DriverActions order={order} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: theme.radius.md,
    borderWidth: theme.layout.border,
    borderColor: theme.colors.line,
  },
  stripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: theme.spacing[1],
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    minHeight: theme.layout.rowMinHeight,
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
  },
  below: {
    paddingHorizontal: theme.spacing[3],
    paddingBottom: theme.spacing[3],
  },
  when: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1],
  },
  content: {
    flex: 1,
  },
  rank: {
    width: theme.spacing[4] + theme.spacing[1],
    height: theme.spacing[4] + theme.spacing[1],
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    minHeight: theme.spacing[6],
  },
  flex: {
    flex: 1,
  },
  phone: {
    width: theme.layout.controlHeight,
    height: theme.layout.controlHeight,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.navySoft,
  },
  strong: {
    fontFamily: theme.typography.heading.fontFamily,
  },
  total: {
    fontFamily: theme.typography.heading.fontFamily,
    fontVariant: ['tabular-nums'],
  },
  amount: {
    ...textStyles.label,
    fontFamily: theme.typography.heading.fontFamily,
    fontVariant: ['tabular-nums'],
  },
  pressed: {
    opacity: theme.layout.pressedOpacity,
  },
  details: {
    gap: theme.spacing[3],
  },
  where: {
    gap: theme.spacing[1],
  },
  amounts: {
    gap: theme.spacing[1],
    padding: theme.spacing[3],
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
  },
  totalLine: {
    paddingTop: theme.spacing[1],
    borderTopWidth: theme.layout.border,
    borderTopColor: theme.colors.line,
  },
  figure: {
    fontVariant: ['tabular-nums'],
  },
});
