import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  ArrowRight,
  CalendarDays,
  Check,
  MessageCircle,
  Pencil,
  Phone,
  Store,
  Truck,
  Wallet,
} from 'lucide-react-native';
import { useState } from 'react';
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
import { parcelLabel, type Order } from '@/features/order/order-api';
import {
  actionLabels,
  destructiveStatuses,
  quickActionLabels,
  SOURCE_LABELS,
  TRANSITIONS,
} from '@/features/order/order-status';
import { DateChoice } from '@/features/order/date-choice';
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
import { textStyles, theme } from '@/theme';
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
      {/* Summary: what the customer pays, where the order stands. */}
      <View style={[styles.card, styles.summary]}>
        {/* Written on the parcel by the seller; the driver's only reference (RG-61). */}
        {o.delivery && (
          <AppText variant="heading" color="blue">
            {parcelLabel(o)}
          </AppText>
        )}
        <View style={styles.row}>
          <AppText style={[styles.total, styles.flex]}>{formatAr(o.totalAmount)}</AppText>
          {o.source && (
            <AppText variant="caption" color="inkMuted">
              {SOURCE_LABELS[o.source]}
            </AppText>
          )}
        </View>
        <View style={styles.row}>
          <StatusBadge status={o.status} size="sm" />
          <PaymentBadge isPaid={o.isPaid} />
          {o.paymentMethod && (
            <AppText variant="caption" color="inkMuted">
              {o.paymentMethod}
            </AppText>
          )}
        </View>
        <AppText variant="caption" color="inkMuted">
          Créée le {formatDateTime(o.createdAt)}
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

      <CustomerCard order={o} pressable={canOpenCustomer} />

      {/* Hand-over: planned day, pickup or delivery. */}
      <View style={styles.section}>
        <AppText variant="heading">Remise et date</AppText>
        <View style={styles.card}>
          <View style={styles.row}>
            <CalendarDays
              size={theme.layout.iconMd}
              color={overdue ? theme.colors.statusCancelledFg : theme.colors.inkMuted}
              strokeWidth={2}
            />
            <View style={styles.flex}>
              <AppText style={styles.strong} color={overdue ? 'statusCancelledFg' : 'ink'}>
                {formatDayLabel(o.scheduledDate)}
                {overdue ? ' · en retard' : ''}
              </AppText>
              <AppText variant="caption" color="inkMuted">
                Date prévue
              </AppText>
            </View>
            {editable && (
              <Button
                label="Changer"
                variant="ghost"
                compact
                onPress={() => {
                  setNewDate(o.scheduledDate);
                  setDateOpen(true);
                }}
              />
            )}
          </View>
          <View style={[styles.row, styles.lineBorder, styles.block]}>
            {o.delivery ? (
              <Truck size={theme.layout.iconMd} color={theme.colors.inkMuted} strokeWidth={2} />
            ) : (
              <Store size={theme.layout.iconMd} color={theme.colors.inkMuted} strokeWidth={2} />
            )}
            <View style={styles.flex}>
              <AppText style={styles.strong}>
                {o.delivery ? (o.delivery.place ?? 'Livraison') : 'Retrait'}
              </AppText>
              <AppText variant="caption" color="inkMuted">
                {o.delivery
                  ? [o.delivery.address, o.delivery.note].filter(Boolean).join(' · ') ||
                    'À une adresse'
                  : 'En main propre'}
              </AppText>
            </View>
          </View>
        </View>
      </View>

      <Modal visible={dateOpen} animationType="slide" onRequestClose={() => setDateOpen(false)}>
        <View style={[styles.modal, { paddingTop: insets.top + theme.spacing[3] }]}>
          <AppText variant="heading">Date prévue</AppText>
          <DateChoice value={newDate} onChange={setNewDate} />
          {updateOrder.isError && (
            <AlertBanner tone="danger" message={apiErrorMessage(updateOrder.error)} />
          )}
          <Button
            label="Enregistrer la date"
            fullWidth
            loading={updateOrder.isPending}
            onPress={() =>
              newDate &&
              updateOrder.mutate(
                { scheduledDate: newDate },
                { onSuccess: () => setDateOpen(false) },
              )
            }
          />
          <Button label="Annuler" variant="ghost" onPress={() => setDateOpen(false)} />
        </View>
      </Modal>

      <View style={styles.section}>
        <AppText variant="heading">{o.items ? 'Produits' : 'Montants'}</AppText>
        <View style={styles.card}>
          {/* Drivers get no items (RG-61): only the amount of the articles. */}
          {!o.items && (
            <View style={styles.line}>
              <AppText color="inkMuted" style={styles.flex}>
                Articles
              </AppText>
              <AppText style={styles.amount}>{formatAr(o.itemsAmount)}</AppText>
            </View>
          )}
          {o.items?.map((item, index) => (
            <View key={item.id} style={[styles.line, index > 0 && styles.lineBorder]}>
              <View style={styles.flex}>
                <AppText style={styles.strong}>{item.productName}</AppText>
                <AppText variant="caption" color="inkMuted">
                  {item.quantity} × {formatAr(item.unitSellingPrice)}
                </AppText>
              </View>
              <AppText style={styles.amount}>{formatAr(item.subtotal)}</AppText>
            </View>
          ))}
          {o.delivery && (
            <View style={[styles.line, styles.lineBorder]}>
              <AppText color="inkMuted" style={styles.flex}>
                Frais de livraison
              </AppText>
              <AppText style={styles.amount}>{formatAr(o.deliveryFee)}</AppText>
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

function CustomerCard({ order, pressable }: { order: Order; pressable: boolean }) {
  const customer = order.customer;
  if (!customer) {
    return (
      <View style={styles.card}>
        <AppText color="inkMuted">Client non renseigné</AppText>
      </View>
    );
  }
  return (
    <View style={styles.section}>
      <Pressable
        onPress={pressable ? () => router.push(`/customers/${customer.id}`) : undefined}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <AppText variant="caption" color="inkMuted">
          Client
        </AppText>
        <AppText variant="heading">{customer.name}</AppText>
        {customer.phone && <AppText color="inkMuted">{formatPhone(customer.phone)}</AppText>}
      </Pressable>
      {customer.phone && (
        <View style={styles.row}>
          <View style={styles.flex}>
            <Button
              label="Appeler"
              icon={Phone}
              fullWidth
              onPress={() => callPhone(customer.phone!)}
            />
          </View>
          <View style={styles.flex}>
            <Button
              label="WhatsApp"
              icon={MessageCircle}
              fullWidth
              onPress={() => openWhatsApp(customer.phone!)}
            />
          </View>
        </View>
      )}
    </View>
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
    gap: theme.spacing[2],
  },
  block: {
    marginTop: theme.spacing[3],
    paddingTop: theme.spacing[3],
  },
  section: {
    gap: theme.spacing[3],
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
    padding: theme.spacing[4],
    gap: theme.spacing[1],
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing[3],
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    paddingVertical: theme.spacing[2],
  },
  lineBorder: {
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
  total: {
    ...textStyles.amountMd,
  },
  pressed: {
    opacity: 0.85,
  },
});
