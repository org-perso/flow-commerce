import { CircleCheck } from 'lucide-react-native';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlertBanner, AppText, Button } from '@/components/ui';
import { apiErrorMessage } from '@/lib/api-client';
import { theme } from '@/theme';
import { formatAr } from '@/utils/format';

import type { Order } from './order-api';
import { PAYMENT_METHODS } from './order-status';
import { useUpdateOrder } from './use-orders';

/**
 * Right after "Livrée" on an unpaid delivery: how did the customer pay? One tap records the
 * payment; "Pas encore payé" leaves it to collect later.
 */
export function PaymentSheet({
  order,
  visible,
  justDelivered = true,
  onClose,
}: {
  order: Order;
  visible: boolean;
  /** Opened by "Livrée" (celebrates it) rather than by "Mode de paiement". */
  justDelivered?: boolean;
  onClose: () => void;
}) {
  const updateOrder = useUpdateOrder(order.id);
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fermer" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + theme.spacing[4] }]}>
        <View style={styles.header}>
          {justDelivered && (
            <CircleCheck
              size={theme.layout.iconLg}
              color={theme.colors.statusDeliveredFg}
              strokeWidth={2}
            />
          )}
          <AppText variant="heading">{justDelivered ? 'Livrée !' : 'Mode de paiement'}</AppText>
        </View>
        <AppText color="inkMuted">Comment le client a payé {formatAr(order.totalAmount)} ?</AppText>
        {updateOrder.isError && (
          <AlertBanner tone="danger" message={apiErrorMessage(updateOrder.error)} />
        )}
        <View style={styles.methods}>
          {PAYMENT_METHODS.map((method) => (
            <View key={method} style={styles.method}>
              <Button
                label={method}
                variant={method === 'Espèces' ? 'primary' : 'secondary'}
                fullWidth
                loading={updateOrder.isPending && updateOrder.variables?.paymentMethod === method}
                onPress={() =>
                  updateOrder.mutate(
                    { isPaid: true, paymentMethod: method },
                    { onSuccess: onClose },
                  )
                }
              />
            </View>
          ))}
        </View>
        <Button
          label={justDelivered ? 'Pas encore payé' : 'Annuler'}
          variant="ghost"
          onPress={onClose}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
  },
  sheet: {
    gap: theme.spacing[3],
    padding: theme.spacing[4],
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
  },
  methods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[2],
  },
  method: {
    flexBasis: '48%',
    flexGrow: 1,
  },
});
