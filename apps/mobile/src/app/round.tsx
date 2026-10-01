import { router } from 'expo-router';
import { ArrowDown, ArrowUp } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, FormScreen } from '@/components/ui';
import type { Order } from '@/features/order/order-api';
import { roundOrder } from '@/features/order/round';
import { slotLabel } from '@/features/order/time-slot';
import { useDriverOrders, useSetDriverRoute } from '@/features/order/use-orders';
import { apiErrorMessage } from '@/lib/api-client';
import { hitSlopFor, theme } from '@/theme';
import { businessToday } from '@/utils/format';

const isOpen = (o: Order) => !['LIVREE', 'ANNULEE', 'RETOUR'].includes(o.status);

function MoveButton({
  icon: Icon,
  label,
  onPress,
}: {
  icon: typeof ArrowUp;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={hitSlopFor(theme.layout.iconMd)}
      style={({ pressed }) => [styles.move, !onPress && styles.disabled, pressed && styles.pressed]}
    >
      <Icon size={theme.layout.iconMd} color={theme.colors.ink} strokeWidth={2} />
    </Pressable>
  );
}

/**
 * The driver puts today's deliveries in the order of their round with ↑ ↓ (more reliable
 * than drag and drop on Android). Starts from the current order: theirs, or the automatic one.
 */
export default function RoundScreen() {
  const today = businessToday();
  const orders = useDriverOrders('mine');
  const save = useSetDriverRoute();
  const current = orders.items.filter((o) => isOpen(o) && o.scheduledDate <= today);
  // null until the driver moves something: follows the list while it loads.
  const [ids, setIds] = useState<string[] | null>(null);
  const auto = roundOrder(current, today);
  const byId = new Map(current.map((o) => [o.id, o]));
  const list = ids
    ? [
        ...ids.map((id) => byId.get(id)).filter((o): o is Order => !!o),
        ...auto.filter((o) => !ids.includes(o.id)),
      ]
    : auto;

  const move = (from: number, to: number) => {
    const next = list.map((o) => o.id);
    [next[from], next[to]] = [next[to]!, next[from]!];
    setIds(next);
  };

  const submit = (orderIds: string[]) => save.mutate(orderIds, { onSuccess: () => router.back() });

  return (
    <FormScreen
      submitLabel="Enregistrer ma tournée"
      submitting={save.isPending}
      error={save.error ? apiErrorMessage(save.error) : undefined}
      onSubmit={() => submit(list.map((o) => o.id))}
      extra={
        <Button label="Revenir à l’ordre automatique" variant="ghost" onPress={() => submit([])} />
      }
    >
      <AppText color="inkMuted">
        Rangez vos livraisons dans l’ordre où vous passerez. Les nouvelles arriveront en bas, dans «
        À placer ».
      </AppText>
      <View style={styles.list}>
        {list.map((order, index) => (
          <View key={order.id} style={styles.row}>
            <View style={styles.rank}>
              <AppText variant="label" color="onNavy" style={styles.strong}>
                {index + 1}
              </AppText>
            </View>
            <View style={styles.info}>
              <AppText style={styles.strong} numberOfLines={1}>
                {order.delivery?.place?.trim() || 'Lieu non précisé'}
              </AppText>
              <AppText variant="caption" color="inkMuted" numberOfLines={1}>
                {[
                  `#${String(order.number).padStart(3, '0')}`,
                  order.customer?.name,
                  slotLabel(order.timeSlot),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </AppText>
            </View>
            <MoveButton
              icon={ArrowUp}
              label="Monter"
              onPress={index > 0 ? () => move(index, index - 1) : undefined}
            />
            <MoveButton
              icon={ArrowDown}
              label="Descendre"
              onPress={index < list.length - 1 ? () => move(index, index + 1) : undefined}
            />
          </View>
        ))}
      </View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: theme.spacing[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    minHeight: theme.sizes.tapMin,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.radius.md,
    borderWidth: theme.layout.border,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.surfaceRaised,
  },
  rank: {
    width: theme.spacing[6],
    height: theme.spacing[6],
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  strong: {
    fontFamily: theme.typography.heading.fontFamily,
  },
  move: {
    width: theme.sizes.tapMin,
    height: theme.sizes.tapMin,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
  },
  disabled: {
    opacity: theme.layout.disabledOpacity,
  },
  pressed: {
    opacity: theme.layout.pressedOpacity,
  },
});
