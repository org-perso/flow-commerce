import { ChevronDown, ChevronUp, MapPin, MessageCircle, Phone } from 'lucide-react-native';
import { useState } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, StatusBadge } from '@/components/ui';
import { callPhone, openWhatsApp } from '@/features/customer/contact';
import { textStyles, theme } from '@/theme';
import { businessToday, formatAr, formatDayLabel } from '@/utils/format';

import { DriverActions } from './driver-actions';
import { parcelLabel, type Order } from './order-api';
import { isOverdue } from './order-row';

/**
 * A delivery for the driver (F-13), folded by default: parcel number, status, customer and
 * place, amount to collect. A tap unfolds it in place (no separate page): full address and
 * notes, amounts, call buttons and every action (set off, delivered, collect, return,
 * give back). `claimable`: a delivery to take, its "Je la prends" button always visible.
 */
export function DeliveryCard({ order, claimable }: { order: Order; claimable?: boolean }) {
  const [open, setOpen] = useState(false);
  const today = businessToday();
  const phone = order.customer?.phone;
  const place = order.delivery?.place ?? order.delivery?.address ?? 'À livrer';
  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  };
  const Chevron = open ? ChevronUp : ChevronDown;

  return (
    <View style={styles.card}>
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
      >
        <View style={styles.line}>
          <AppText variant="heading" color="blue" style={styles.flex}>
            {parcelLabel(order)}
          </AppText>
          <StatusBadge status={order.status} size="sm" />
          <Chevron size={theme.layout.iconMd} color={theme.colors.inkMuted} strokeWidth={2} />
        </View>
        <View style={styles.line}>
          <MapPin size={theme.layout.iconSm} color={theme.colors.inkMuted} strokeWidth={2} />
          <AppText numberOfLines={1} style={styles.flex}>
            <AppText style={styles.strong}>{order.customer?.name ?? 'Client de passage'}</AppText>
            <AppText color="inkMuted">{` · ${place}`}</AppText>
          </AppText>
        </View>
        <View style={styles.line}>
          <AppText
            variant="caption"
            color={isOverdue(order, today) ? 'statusCancelledFg' : 'inkMuted'}
            style={styles.flex}
          >
            {formatDayLabel(order.scheduledDate, today)}
          </AppText>
          <AppText style={styles.amount} color={order.isPaid ? 'statusDeliveredFg' : 'ink'}>
            {order.isPaid ? 'Payée' : `À encaisser ${formatAr(order.totalAmount)}`}
          </AppText>
        </View>
      </Pressable>

      {open && (
        <View style={styles.details}>
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
                  : 'À encaisser'}
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
      {claimable && <DriverActions order={order} />}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: theme.spacing[3],
    padding: theme.spacing[4],
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: theme.layout.border,
    borderColor: theme.colors.line,
  },
  body: {
    gap: theme.spacing[2],
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
  },
  flex: {
    flex: 1,
  },
  strong: {
    fontFamily: theme.typography.heading.fontFamily,
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
