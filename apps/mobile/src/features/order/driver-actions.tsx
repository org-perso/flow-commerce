import { Check, Hand, Navigation, Undo2, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AlertBanner, Button, type OrderStatus } from '@/components/ui';
import { apiErrorMessage } from '@/lib/api-client';
import { theme } from '@/theme';
import { formatAr } from '@/utils/format';

import type { Order } from './order-api';
import { OPEN_STATUSES, TRANSITIONS } from './order-status';
import { PaymentSheet } from './payment-sheet';
import {
  useChangeOrderStatus,
  useClaimDelivery,
  useReleaseDelivery,
  useUpdateOrder,
} from './use-orders';

/**
 * What a driver does on a delivery (F-13): take it, set off, delivered, collect the payment,
 * report a return, give it back. The API only lets them act on their own deliveries.
 */
export function DriverActions({ order }: { order: Order }) {
  const claim = useClaimDelivery(order.id);
  const release = useReleaseDelivery(order.id);
  const changeStatus = useChangeOrderStatus(order.id);
  const updateOrder = useUpdateOrder(order.id);
  // The payment sheet: right after "Livrée", or opened from "Mode de paiement".
  const [payment, setPayment] = useState<'delivered' | 'choose' | null>(null);
  const error = claim.error ?? release.error ?? changeStatus.error ?? updateOrder.error;
  const banner = error ? <AlertBanner tone="danger" message={apiErrorMessage(error)} /> : null;

  if (!order.driver) {
    return (
      <View style={styles.section}>
        {banner}
        <Button
          label="Je la prends"
          icon={Hand}
          variant="primary"
          fullWidth
          loading={claim.isPending}
          onPress={() => claim.mutate()}
        />
      </View>
    );
  }

  const next = TRANSITIONS[order.status];
  const allows = (status: OrderStatus) => next.includes(status);
  const open = OPEN_STATUSES.includes(order.status);

  const confirm = (title: string, message: string, label: string, run: () => void) =>
    Alert.alert(title, message, [
      { text: 'Annuler', style: 'cancel' },
      { text: label, style: 'destructive', onPress: run },
    ]);

  return (
    <View style={styles.section}>
      {banner}
      <View style={styles.row}>
        {allows('EN_LIVRAISON') && (
          <View style={styles.flex}>
            <Button
              label="En route"
              icon={Navigation}
              fullWidth
              loading={changeStatus.isPending && changeStatus.variables === 'EN_LIVRAISON'}
              onPress={() => changeStatus.mutate('EN_LIVRAISON')}
            />
          </View>
        )}
        {allows('LIVREE') && (
          <View style={styles.flex}>
            <Button
              label="Livrée"
              icon={Check}
              variant="dark"
              fullWidth
              loading={changeStatus.isPending && changeStatus.variables === 'LIVREE'}
              onPress={() =>
                changeStatus.mutate('LIVREE', {
                  onSuccess: (o) => !o.isPaid && setPayment('delivered'),
                })
              }
            />
          </View>
        )}
      </View>

      {/* Same full-width buttons for the payment and for giving the delivery back. */}
      {!order.isPaid && order.status !== 'ANNULEE' && order.status !== 'RETOUR' && (
        <Button
          label={`Mode de paiement · ${formatAr(order.totalAmount)}`}
          icon={Wallet}
          fullWidth
          loading={updateOrder.isPending}
          onPress={() => setPayment('choose')}
        />
      )}

      {allows('RETOUR') && (
        <Button
          label="Signaler un retour"
          variant="danger"
          fullWidth
          onPress={() =>
            confirm(
              'Signaler un retour ?',
              'Le client n’a pas pris la commande : les produits reviennent en stock.',
              'Signaler le retour',
              () => changeStatus.mutate('RETOUR'),
            )
          }
        />
      )}

      {open && (
        <Button
          label="Je ne la prends plus"
          icon={Undo2}
          fullWidth
          loading={release.isPending}
          onPress={() =>
            confirm(
              'Vous ne prenez plus cette livraison ?',
              'Elle repasse dans « À prendre » pour les autres livreurs.',
              'Je ne la prends plus',
              () => release.mutate(),
            )
          }
        />
      )}
      <PaymentSheet
        order={order}
        visible={payment !== null}
        justDelivered={payment === 'delivered'}
        onClose={() => setPayment(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: theme.spacing[3],
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing[3],
  },
  flex: {
    flex: 1,
  },
});
