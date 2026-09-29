import { router, Stack, useLocalSearchParams } from 'expo-router';
import { MessageCircle, Phone } from 'lucide-react-native';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import {
  AlertBanner,
  AppText,
  Button,
  Screen,
  StatusBadge,
  type OrderStatus,
} from '@/components/ui';
import { callPhone, formatPhone, openWhatsApp } from '@/features/customer/contact';
import type { Order } from '@/features/order/order-api';
import { actionLabels, destructiveStatuses, TRANSITIONS } from '@/features/order/order-status';
import { useChangeOrderStatus, useOrder } from '@/features/order/use-orders';
import { ApiError, apiErrorMessage } from '@/lib/api-client';
import { textStyles, theme } from '@/theme';
import { formatAr, formatDateTime } from '@/utils/format';

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
          <View style={[styles.line, styles.lineBorder]}>
            <AppText color="inkMuted" style={styles.flex}>
              Livraison
            </AppText>
            <AppText style={styles.amount}>{formatAr(o.deliveryFee)}</AppText>
          </View>
          <View style={[styles.line, styles.lineBorder]}>
            <AppText style={[styles.flex, styles.strong]}>Total à payer</AppText>
            <AppText style={styles.total}>{formatAr(o.totalAmount)}</AppText>
          </View>
        </View>
      </View>

      {(o.address || o.paymentMethod) && (
        <View style={[styles.card, styles.details]}>
          {o.address && <Detail label="Adresse de livraison" value={o.address} />}
          {o.paymentMethod && <Detail label="Paiement" value={o.paymentMethod} />}
        </View>
      )}

      {next.length > 0 && (
        <View style={styles.section}>
          <AppText variant="heading">Suivi</AppText>
          {forward.map((status, index) => (
            <Button
              key={status}
              label={actionLabels[status]}
              variant={index === 0 ? 'primary' : 'secondary'}
              fullWidth
              loading={changeStatus.isPending && changeStatus.variables === status}
              onPress={() => moveTo(status)}
            />
          ))}
          {destructive.map((status) => (
            <Button
              key={status}
              label={actionLabels[status]}
              variant="danger"
              fullWidth
              loading={changeStatus.isPending && changeStatus.variables === status}
              onPress={() => moveTo(status)}
            />
          ))}
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
