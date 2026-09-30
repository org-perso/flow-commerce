import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ArrowRight, CalendarDays, Check, MessageCircle, Phone } from 'lucide-react-native';
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
import type { Order } from '@/features/order/order-api';
import {
  actionLabels,
  destructiveStatuses,
  SOURCE_LABELS,
  TRANSITIONS,
} from '@/features/order/order-status';
import { DateChoice } from '@/features/order/date-choice';
import { isOverdue } from '@/features/order/order-row';
import { PaymentBadge } from '@/features/order/payment-badge';
import { useChangeOrderStatus, useOrder, useUpdateOrder } from '@/features/order/use-orders';
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
  const changeStatus = useChangeOrderStatus(orderId);
  const updateOrder = useUpdateOrder(orderId);
  const insets = useSafeAreaInsets();
  const [dateOpen, setDateOpen] = useState(false);
  const [newDate, setNewDate] = useState<string | null>(null);

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

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: 'Commande' }} />

      <View style={styles.headerRow}>
        <StatusBadge status={o.status} />
        <AppText variant="caption" color="inkMuted">
          {formatDateTime(o.createdAt)}
        </AppText>
      </View>

      {changeStatus.isError && (
        <AlertBanner tone="danger" message={statusErrorMessage(changeStatus.error, o)} />
      )}

      <View style={[styles.card, styles.dateCard]}>
        <View style={styles.flex}>
          <AppText variant="caption" color="inkMuted">
            Date prévue
          </AppText>
          <AppText variant="heading" color={overdue ? 'statusCancelledFg' : 'ink'}>
            {formatDayLabel(o.scheduledDate)}
            {overdue ? ' · en retard' : ''}
          </AppText>
        </View>
        {TRANSITIONS[o.status].length > 0 && (
          <Button
            label="Changer"
            icon={CalendarDays}
            compact
            onPress={() => {
              setNewDate(o.scheduledDate);
              setDateOpen(true);
            }}
          />
        )}
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

      <CustomerCard order={o} />

      <View style={styles.section}>
        <AppText variant="heading">Produits</AppText>
        <View style={styles.card}>
          {o.items.map((item, index) => (
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
                Livraison
              </AppText>
              <AppText style={styles.amount}>{formatAr(o.deliveryFee)}</AppText>
            </View>
          )}
          <View style={[styles.line, styles.lineBorder]}>
            <AppText style={[styles.flex, styles.strong]}>Total à payer</AppText>
            <AppText style={styles.total}>{formatAr(o.totalAmount)}</AppText>
          </View>
        </View>
      </View>

      <View style={[styles.card, styles.dateCard]}>
        <View style={styles.flex}>
          <AppText variant="caption" color="inkMuted">
            Paiement{o.paymentMethod ? ` · ${o.paymentMethod}` : ''}
          </AppText>
          <PaymentBadge isPaid={o.isPaid} />
        </View>
        {TRANSITIONS[o.status].length > 0 && (
          <Button
            label={o.isPaid ? 'Marquer non payée' : 'Marquer comme payée'}
            icon={o.isPaid ? undefined : Check}
            compact
            loading={updateOrder.isPending && !dateOpen}
            onPress={() => updateOrder.mutate({ isPaid: !o.isPaid })}
          />
        )}
      </View>
      {updateOrder.isError && !dateOpen && (
        <AlertBanner tone="danger" message={apiErrorMessage(updateOrder.error)} />
      )}

      <View style={[styles.card, styles.details]}>
        <Detail
          label="Livraison"
          value={o.delivery ? 'À livrer' : 'Sans livraison (retrait ou remise en main propre)'}
        />
        {o.delivery?.place && <Detail label="Lieu" value={o.delivery.place} />}
        {o.delivery?.address && <Detail label="Adresse" value={o.delivery.address} />}
        {o.delivery?.note && <Detail label="Précisions" value={o.delivery.note} />}
        {o.source && <Detail label="Source" value={SOURCE_LABELS[o.source]} />}
      </View>

      {next.length > 0 && (
        <View style={styles.section}>
          <AppText variant="heading">Suivi</AppText>
          {/* The usual next step as a button; every other allowed status in the list. */}
          {forward[0] && (
            <Button
              label={actionLabels[forward[0]]}
              icon={ArrowRight}
              fullWidth
              loading={changeStatus.isPending}
              onPress={() => moveTo(forward[0]!)}
            />
          )}
          {next.length > (forward[0] ? 1 : 0) && (
            <Dropdown
              title="Changer le statut"
              value=""
              onChange={(status) => status && moveTo(status)}
              options={[
                { value: '' as const, label: 'Changer le statut…' },
                ...[...forward.slice(1), ...destructive].map((status) => ({
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
    </Screen>
  );
}

function CustomerCard({ order }: { order: Order }) {
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
        onPress={() => router.push(`/customers/${customer.id}`)}
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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <AppText variant="caption" color="inkMuted">
        {label}
      </AppText>
      <AppText>{value}</AppText>
    </View>
  );
}

function statusErrorMessage(error: unknown, order: Order): string {
  if (error instanceof ApiError && error.title === 'Insufficient Stock') {
    const name = order.items.find((i) => i.productId === error.body.productId)?.productName;
    return `Stock insuffisant${name ? ` pour « ${name} »` : ''} : il en reste ${String(error.body.available)}. Ajoutez du stock puis réessayez.`;
  }
  return apiErrorMessage(error);
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  section: {
    gap: theme.spacing[3],
  },
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  details: {
    gap: theme.spacing[3],
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
    borderTopWidth: StyleSheet.hairlineWidth,
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
