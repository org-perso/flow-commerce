import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  ArrowRight,
  CalendarDays,
  Check,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Store,
  User,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AlertBanner,
  AppText,
  Button,
  Dropdown,
  Screen,
  StatusBadge,
  type OrderStatus,
} from '@/components/ui';
import { callPhone, formatPhone, openWhatsApp } from '@/features/customer/contact';
import { parcelLabel, parcelNumber, type Order } from '@/features/order/order-api';
import {
  actionLabels,
  destructiveStatuses,
  quickActionLabels,
  SOURCE_LABELS,
  TRANSITIONS,
} from '@/features/order/order-status';
import { DateChoice } from '@/features/order/date-choice';
import { slotLabel, type TimeSlot } from '@/features/order/time-slot';
import { TimeSlotChoice } from '@/features/order/time-slot-choice';
import { DriverActions } from '@/features/order/driver-actions';
import { DriverSection } from '@/features/order/driver-picker';
import { isOverdue } from '@/features/order/order-row';
import { PaymentBadge } from '@/features/order/payment-badge';
import {
  useChangeOrderStatus,
  useLiveRefresh,
  useOrder,
  useUpdateOrder,
} from '@/features/order/use-orders';
import { useCan } from '@/features/shop/use-shop';
import { ApiError, apiErrorMessage } from '@/lib/api-client';
import { hitSlopFor, textStyles, theme } from '@/theme';
import { formatAr, formatDateTime, formatDayLabel } from '@/utils/format';

const confirmTexts: Partial<Record<OrderStatus, { title: string; message: string }>> = {
  ANNULEE: {
    title: 'Annuler la commande ?',
    message: 'Si le stock avait été retiré, il sera remis. Cette action est définitive.',
  },
  RETOUR: {
    title: 'Enregistrer un retour ?',
    message: 'Les produits seront remis en stock. Cette action est définitive.',
  },
};

export default function OrderScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const order = useOrder(orderId);
  useLiveRefresh(order.refetch);
  const changeStatus = useChangeOrderStatus(orderId);
  const updateOrder = useUpdateOrder(orderId);
  const insets = useSafeAreaInsets();
  const [dateOpen, setDateOpen] = useState(false);
  const [newDate, setNewDate] = useState<string | null>(null);
  const [newSlot, setNewSlot] = useState<TimeSlot | null>(null);
  // Drivers get their own actions (F-13); the API limits them to their deliveries.
  const isDriver = !useCan('orders');
  const canOpenCustomer = useCan('customers');

  if (!order.data) {
    return (
      <Screen edges={[]}>
        {order.isError ? (
          <AlertBanner tone="danger" message={apiErrorMessage(order.error)} />
        ) : (
          <ActivityIndicator color={theme.colors.ink} />
        )}
      </Screen>
    );
  }

  const o = order.data;
  const overdue = isOverdue(o);
  const next = TRANSITIONS[o.status];
  const forward = next.filter((s) => !destructiveStatuses.includes(s));
  const destructive = next.filter((s) => destructiveStatuses.includes(s));

  const moveTo = (status: OrderStatus) => {
    const confirm = confirmTexts[status];
    if (!confirm) return changeStatus.mutate(status);
    Alert.alert(confirm.title, confirm.message, [
      { text: 'Retour', style: 'cancel' },
      {
        text: actionLabels[status],
        style: 'destructive',
        onPress: () => changeStatus.mutate(status),
      },
    ]);
  };

  const editable = next.length > 0 && !isDriver;
  const nextStep = forward[0];
  const otherStatuses = [...forward.slice(1), ...destructive];

  return (
    <Screen edges={[]} onRefresh={() => order.refetch()} refreshing={order.isRefetching}>
      {editable && (
        <Stack.Screen
          options={{
            headerRight: () => (
              <Button
                label="Modifier"
                icon={Pencil}
                compact
                onPress={() => router.push(`/orders/edit/${o.id}`)}
              />
            ),
          }}
        />
      )}
      {/* Summary: number, where the order stands, what the customer pays. */}
      <View style={[styles.card, styles.summary]}>
        <View style={styles.headRow}>
          {/* Written on the parcel by the seller; the driver's only reference (RG-61). */}
          <AppText variant="label" color="blue" style={styles.strong}>
            {o.delivery ? parcelLabel(o) : `Commande ${parcelNumber(o)}`}
          </AppText>
          <StatusBadge status={o.status} size="sm" />
          <PaymentBadge isPaid={o.isPaid} />
        </View>
        <AppText style={styles.total}>{formatAr(o.totalAmount)}</AppText>
        <AppText variant="caption" color="inkMuted">
          {[
            o.paymentMethod,
            o.source ? SOURCE_LABELS[o.source] : null,
            `créée le ${formatDateTime(o.createdAt)}`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </AppText>
      </View>

      {changeStatus.isError && (
        <AlertBanner tone="danger" message={statusErrorMessage(changeStatus.error, o)} />
      )}
      {updateOrder.isError && !dateOpen && (
        <AlertBanner tone="danger" message={apiErrorMessage(updateOrder.error)} />
      )}

      {/* Actions first: next step and cashing in, one tap each. */}
      {editable && (
        <View style={styles.section}>
          {(nextStep || !o.isPaid) && (
            <View style={styles.row}>
              {nextStep && (
                <View style={styles.flex}>
                  <Button
                    label={quickActionLabels[nextStep] ?? actionLabels[nextStep]}
                    icon={nextStep === 'LIVREE' ? Check : ArrowRight}
                    variant="dark"
                    fullWidth
                    loading={changeStatus.isPending}
                    onPress={() => moveTo(nextStep)}
                  />
                </View>
              )}
              {!o.isPaid && (
                <View style={styles.flex}>
                  <Button
                    label="Encaisser"
                    icon={Wallet}
                    fullWidth
                    loading={updateOrder.isPending && !dateOpen}
                    onPress={() => updateOrder.mutate({ isPaid: true })}
                  />
                </View>
              )}
            </View>
          )}
          {otherStatuses.length > 0 && (
            <Dropdown
              title="Changer le statut"
              value=""
              onChange={(status) => status && moveTo(status)}
              options={[
                { value: '' as const, label: 'Changer le statut…' },
                ...otherStatuses.map((status) => ({
                  value: status,
                  label: theme.statusColors[status].label,
                  leading: (
                    <View
                      style={[styles.dot, { backgroundColor: theme.statusColors[status].fg }]}
                    />
                  ),
                })),
              ]}
            />
          )}
        </View>
      )}

      {isDriver && <DriverActions order={o} />}

      {!isDriver && <DriverSection order={o} />}

      {/* Where, when, who: one card, one line each. */}
      <View style={styles.group}>
        <SectionLabel>{o.delivery ? 'Livraison' : 'Retrait'}</SectionLabel>
        <View style={[styles.card, styles.list]}>
          <InfoLine
            icon={o.delivery ? MapPin : Store}
            title={o.delivery ? (o.delivery.place ?? 'Lieu non précisé') : 'Retrait en main propre'}
            subtitle={
              o.delivery
                ? [o.delivery.address, o.delivery.note].filter(Boolean).join(' · ') || undefined
                : undefined
            }
          />
          <InfoLine
            divider
            icon={CalendarDays}
            danger={overdue}
            title={`${formatDayLabel(o.scheduledDate)}${overdue ? ' · en retard' : ''}`}
            subtitle={slotLabel(o.timeSlot) ?? 'Toute la journée'}
            trailing={
              editable ? (
                <Button
                  label="Changer"
                  variant="ghost"
                  compact
                  onPress={() => {
                    setNewDate(o.scheduledDate);
                    setNewSlot(o.timeSlot);
                    setDateOpen(true);
                  }}
                />
              ) : undefined
            }
          />
          <CustomerLine order={o} pressable={canOpenCustomer} />
        </View>
      </View>

      <Modal visible={dateOpen} animationType="slide" onRequestClose={() => setDateOpen(false)}>
        <View style={[styles.modal, { paddingTop: insets.top + theme.spacing[3] }]}>
          <AppText variant="heading">Date prévue</AppText>
          <DateChoice value={newDate} onChange={setNewDate} />
          <AppText variant="label">Heure</AppText>
          <TimeSlotChoice value={newSlot} onChange={setNewSlot} />
          {updateOrder.isError && (
            <AlertBanner tone="danger" message={apiErrorMessage(updateOrder.error)} />
          )}
          <Button
            label="Enregistrer"
            fullWidth
            loading={updateOrder.isPending}
            onPress={() =>
              newDate &&
              updateOrder.mutate(
                { scheduledDate: newDate, timeSlot: newSlot },
                { onSuccess: () => setDateOpen(false) },
              )
            }
          />
          <Button label="Annuler" variant="ghost" onPress={() => setDateOpen(false)} />
        </View>
      </Modal>

      <View style={styles.group}>
        <SectionLabel>{o.items ? 'Produits' : 'Montants'}</SectionLabel>
        <View style={[styles.card, styles.list]}>
          {/* Drivers get no items (RG-61): only the amount of the articles. */}
          {!o.items && (
            <View style={styles.line}>
              <AppText variant="label" color="inkMuted" style={styles.flex}>
                Articles
              </AppText>
              <AppText variant="label" style={styles.amount}>
                {formatAr(o.itemsAmount)}
              </AppText>
            </View>
          )}
          {o.items?.map((item, index) => (
            <View key={item.id} style={[styles.line, index > 0 && styles.lineBorder]}>
              <AppText variant="label" style={styles.qty}>
                {item.quantity} ×
              </AppText>
              <View style={styles.flex}>
                <AppText variant="label" style={styles.strong} numberOfLines={2}>
                  {item.productName}
                </AppText>
                <AppText variant="caption" color="inkMuted">
                  {formatAr(item.unitSellingPrice)} l’unité
                </AppText>
              </View>
              <AppText variant="label" style={styles.amount}>
                {formatAr(item.subtotal)}
              </AppText>
            </View>
          ))}
          {o.delivery && (
            <View style={[styles.line, styles.lineBorder]}>
              <AppText variant="label" color="inkMuted" style={styles.flex}>
                Frais de livraison
              </AppText>
              <AppText variant="label" style={styles.amount}>
                {formatAr(o.deliveryFee)}
              </AppText>
            </View>
          )}
          <View style={[styles.line, styles.lineBorder]}>
            <AppText style={[styles.flex, styles.strong]}>
              {o.isPaid ? 'Total payé' : o.items ? 'Total à payer' : 'À encaisser'}
            </AppText>
            <AppText style={[styles.amount, styles.strong]}>{formatAr(o.totalAmount)}</AppText>
          </View>
        </View>
      </View>

      {/* Rarely needed: undo a payment marked by mistake. */}
      {editable && o.isPaid && (
        <Button
          label="Marquer non payée"
          variant="ghost"
          compact
          loading={updateOrder.isPending && !dateOpen}
          onPress={() => updateOrder.mutate({ isPaid: false })}
        />
      )}
    </Screen>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <AppText variant="caption" color="inkMuted" style={styles.sectionLabel}>
      {children.toUpperCase()}
    </AppText>
  );
}

/** A line of the info card: icon, bold title, small subtitle, optional action on the right. */
function InfoLine({
  icon: Icon,
  title,
  subtitle,
  trailing,
  danger,
  divider,
  onPress,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  danger?: boolean;
  divider?: boolean;
  onPress?: () => void;
}) {
  return (
    <View style={[styles.line, divider && styles.lineBorder]}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        style={({ pressed }) => [styles.lineMain, pressed && styles.pressed]}
      >
        <Icon
          size={theme.layout.iconMd}
          color={danger ? theme.colors.statusCancelledFg : theme.colors.inkMuted}
          strokeWidth={2}
        />
        <View style={styles.flex}>
          <AppText style={styles.strong} color={danger ? 'statusCancelledFg' : 'ink'}>
            {title}
          </AppText>
          {subtitle && (
            <AppText variant="caption" color="inkMuted">
              {subtitle}
            </AppText>
          )}
        </View>
      </Pressable>
      {trailing}
    </View>
  );
}

/** Round call / WhatsApp button, same as on the order cards. */
function RoundAction({
  icon: Icon,
  label,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={hitSlopFor(theme.layout.controlHeight)}
      style={({ pressed }) => [styles.round, pressed && styles.pressed]}
    >
      <Icon size={theme.layout.iconSm} color={theme.colors.blue} strokeWidth={2} />
    </Pressable>
  );
}

function CustomerLine({ order, pressable }: { order: Order; pressable: boolean }) {
  const customer = order.customer;
  // A walk-in customer has no card: the delivery keeps the number to call.
  const phone = customer?.phone ?? order.delivery?.phone ?? null;
  return (
    <InfoLine
      divider
      icon={User}
      title={customer?.name ?? 'Client de passage'}
      subtitle={phone ? formatPhone(phone) : 'Pas de numéro'}
      onPress={customer && pressable ? () => router.push(`/customers/${customer.id}`) : undefined}
      trailing={
        phone ? (
          <View style={styles.actions}>
            <RoundAction
              icon={MessageCircle}
              label="WhatsApp"
              onPress={() => openWhatsApp(phone)}
            />
            <RoundAction
              icon={Phone}
              label={`Appeler ${formatPhone(phone)}`}
              onPress={() => callPhone(phone)}
            />
          </View>
        ) : undefined
      }
    />
  );
}

function statusErrorMessage(error: unknown, order: Order): string {
  if (error instanceof ApiError && error.title === 'Insufficient Stock') {
    const name = order.items?.find((i) => i.productId === error.body.productId)?.productName;
    return `Stock insuffisant${name ? ` pour « ${name} »` : ''} : il en reste ${String(error.body.available)}. Ajoutez du stock puis réessayez.`;
  }
  return apiErrorMessage(error);
}

const styles = StyleSheet.create({
  summary: {
    gap: theme.spacing[1],
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing[2],
  },
  section: {
    gap: theme.spacing[2],
  },
  group: {
    gap: theme.spacing[2],
  },
  sectionLabel: {
    fontFamily: theme.typography.heading.fontFamily,
    paddingHorizontal: theme.spacing[1],
  },
  modal: {
    flex: 1,
    gap: theme.spacing[4],
    padding: theme.spacing[4],
    backgroundColor: theme.colors.surface,
  },
  dot: {
    width: theme.layout.dot * 2,
    height: theme.layout.dot * 2,
    borderRadius: theme.radius.pill,
  },
  card: {
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.md,
    borderWidth: theme.layout.border,
    borderColor: theme.colors.line,
    padding: theme.spacing[3],
  },
  list: {
    paddingVertical: theme.spacing[1],
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing[2],
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    minHeight: theme.layout.controlHeight,
    paddingVertical: theme.spacing[2],
  },
  lineMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
  },
  lineBorder: {
    borderTopWidth: theme.layout.border,
    borderTopColor: theme.colors.line,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing[2],
  },
  round: {
    width: theme.layout.controlHeight,
    height: theme.layout.controlHeight,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.navySoft,
  },
  flex: {
    flex: 1,
  },
  strong: {
    fontFamily: theme.typography.heading.fontFamily,
  },
  qty: {
    fontFamily: theme.typography.heading.fontFamily,
    fontVariant: ['tabular-nums'],
    color: theme.colors.inkMuted,
  },
  amount: {
    fontVariant: ['tabular-nums'],
  },
  total: {
    ...textStyles.amountMd,
  },
  pressed: {
    opacity: theme.layout.pressedOpacity,
  },
});
