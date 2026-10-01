import { Bike, Check } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlertBanner, AppText, Button, EmptyState, ListGroup, ListRow } from '@/components/ui';
import { apiErrorMessage } from '@/lib/api-client';
import { theme } from '@/theme';

import type { Order } from './order-api';
import { OPEN_STATUSES } from './order-status';
import { useAssignDriver, useDrivers } from './use-orders';

/** Driver of a delivery, picked by the owner, manager or CM (F-12, RG-54). */
export function DriverSection({ order }: { order: Order }) {
  if (!order.delivery) {
    return (
      <View style={styles.section}>
        <AppText variant="heading">Livreur</AppText>
        <View style={[styles.card, styles.row]}>
          <Bike size={theme.layout.iconMd} color={theme.colors.inkMuted} strokeWidth={2} />
          <AppText color="inkMuted" style={styles.flex}>
            Retrait en main propre : pas de livreur. Pour en assigner un, passez la commande en
            livraison (Modifier).
          </AppText>
        </View>
      </View>
    );
  }
  return <DeliveryDriver order={order} />;
}

function DeliveryDriver({ order }: { order: Order }) {
  const [open, setOpen] = useState(false);
  const drivers = useDrivers();
  const assign = useAssignDriver(order.id);
  const insets = useSafeAreaInsets();
  const editable = OPEN_STATUSES.includes(order.status);

  const pick = (userId: string | null) =>
    assign.mutate(userId, { onSuccess: () => setOpen(false) });

  return (
    <View style={styles.section}>
      <AppText variant="heading">Livreur</AppText>
      <View style={[styles.card, styles.row]}>
        <Bike size={theme.layout.iconMd} color={theme.colors.inkMuted} strokeWidth={2} />
        <View style={styles.flex}>
          <AppText style={styles.strong}>{order.driver?.name ?? 'À prendre'}</AppText>
          <AppText variant="caption" color="inkMuted">
            {order.driver ? 'Assigné' : 'Aucun livreur : visible par tous les livreurs'}
          </AppText>
        </View>
        {editable && (
          <Button
            label={order.driver ? 'Changer' : 'Choisir'}
            variant="ghost"
            compact
            onPress={() => setOpen(true)}
          />
        )}
      </View>
      {assign.isError && !open && (
        <AlertBanner tone="danger" message={apiErrorMessage(assign.error)} />
      )}

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={[styles.modal, { paddingTop: insets.top + theme.spacing[3] }]}>
          <AppText variant="heading">Choisir un livreur</AppText>
          {assign.isError && <AlertBanner tone="danger" message={apiErrorMessage(assign.error)} />}
          {drivers.data?.length === 0 ? (
            <EmptyState message="Aucun livreur dans l’équipe. Invitez-en un depuis Compte et boutique → Équipe." />
          ) : (
            <ListGroup>
              {drivers.data?.map((d, i) => (
                <ListRow
                  key={d.userId}
                  divider={i > 0}
                  title={d.name}
                  trailing={
                    d.userId === order.driver?.userId ? (
                      <Check size={theme.layout.iconMd} color={theme.colors.blue} strokeWidth={2} />
                    ) : undefined
                  }
                  onPress={assign.isPending ? undefined : () => pick(d.userId)}
                />
              ))}
            </ListGroup>
          )}
          {order.driver && (
            <Button
              label="Retirer le livreur"
              variant="danger"
              fullWidth
              loading={assign.isPending && assign.variables === null}
              onPress={() => pick(null)}
            />
          )}
          <Button label="Annuler" variant="ghost" onPress={() => setOpen(false)} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: theme.spacing[3],
  },
  card: {
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.md,
    padding: theme.spacing[4],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
  },
  flex: {
    flex: 1,
  },
  strong: {
    fontFamily: theme.typography.heading.fontFamily,
  },
  modal: {
    flex: 1,
    gap: theme.spacing[4],
    padding: theme.spacing[4],
    backgroundColor: theme.colors.surface,
  },
});
