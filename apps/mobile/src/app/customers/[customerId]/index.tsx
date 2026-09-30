import { router, Stack, useLocalSearchParams } from 'expo-router';
import { MessageCircle, Pencil, Phone, Plus, type LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import {
  AppText,
  Avatar,
  Button,
  EmptyState,
  InlineBanner,
  KpiCard,
  ListGroup,
  ListRow,
  Screen,
  SectionHeader,
} from '@/components/ui';
import { callPhone, openWhatsApp } from '@/features/customer/contact';
import { useCustomer, useDeleteCustomer } from '@/features/customer/use-customers';
import { OrderRow } from '@/features/order/order-row';
import { useOrders } from '@/features/order/use-orders';
import { ApiError, apiErrorMessage } from '@/lib/api-client';
import { hitSlopFor, theme } from '@/theme';
import { formatAr, formatPhone } from '@/utils/format';

const SOLD = ['CONFIRMEE', 'EN_PREPARATION', 'EN_LIVRAISON', 'LIVREE'];

function QuickAction({
  icon: Icon,
  label,
  onPress,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.quick,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Icon size={theme.layout.iconMd} color={theme.colors.blue} strokeWidth={2} />
      <AppText variant="label" color="ink" numberOfLines={1}>
        {label}
      </AppText>
    </Pressable>
  );
}

export default function CustomerScreen() {
  const { customerId } = useLocalSearchParams<{ customerId: string }>();
  const customer = useCustomer(customerId);
  const orders = useOrders({ customerId });
  const deleteCustomer = useDeleteCustomer(customerId);

  if (!customer.data) {
    return (
      <Screen edges={[]}>
        {customer.isError ? (
          <InlineBanner tone="danger" message={apiErrorMessage(customer.error)} />
        ) : (
          <ActivityIndicator color={theme.colors.ink} />
        )}
      </Screen>
    );
  }

  const c = customer.data;
  const mainPhone = c.phones[0];
  const list = orders.data ?? [];
  const spent = list
    .filter((o) => SOLD.includes(o.status))
    .reduce((sum, o) => sum + o.itemsAmount, 0);

  const confirmDelete = () =>
    Alert.alert('Supprimer ce client ?', 'Cette action est définitive.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => deleteCustomer.mutate(undefined, { onSuccess: () => router.back() }),
      },
    ]);

  const deleteError =
    deleteCustomer.error instanceof ApiError && deleteCustomer.error.status === 409
      ? 'Ce client a des commandes : il est conservé pour garder l’historique.'
      : deleteCustomer.error
        ? apiErrorMessage(deleteCustomer.error)
        : null;

  return (
    <Screen edges={[]}>
      <Stack.Screen
        options={{
          title: c.name,
          headerRight: () => (
            <Button
              label="Modifier"
              icon={Pencil}
              compact
              onPress={() =>
                router.push({ pathname: '/customers/[customerId]/edit', params: { customerId } })
              }
            />
          ),
        }}
      />

      <View style={styles.identity}>
        <Avatar name={c.name} />
        <View style={styles.flex}>
          <AppText variant="heading" numberOfLines={1}>
            {c.name}
          </AppText>
          {c.socialProfile && (
            <AppText variant="caption" color="inkMuted" numberOfLines={1}>
              {c.socialProfile}
            </AppText>
          )}
        </View>
      </View>

      <View style={styles.quickRow}>
        <QuickAction
          icon={Phone}
          label="Appeler"
          disabled={!mainPhone}
          onPress={() => mainPhone && callPhone(mainPhone)}
        />
        <QuickAction
          icon={MessageCircle}
          label="WhatsApp"
          disabled={!mainPhone}
          onPress={() => mainPhone && openWhatsApp(mainPhone)}
        />
        <QuickAction
          icon={Plus}
          label="Commande"
          onPress={() => router.push({ pathname: '/orders/new', params: { customerId } })}
        />
      </View>

      {c.phones.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title={c.phones.length > 1 ? 'Numéros' : 'Numéro'} />
          <ListGroup>
            {c.phones.map((phone, index) => (
              <ListRow
                key={phone}
                title={formatPhone(phone)}
                subtitle={index === 0 ? 'Principal' : undefined}
                trailing={
                  <View style={styles.phoneActions}>
                    <Pressable
                      onPress={() => callPhone(phone)}
                      accessibilityLabel={`Appeler le ${formatPhone(phone)}`}
                      hitSlop={hitSlopFor(theme.layout.controlHeight)}
                      style={styles.iconButton}
                    >
                      <Phone size={theme.layout.iconMd} color={theme.colors.blue} strokeWidth={2} />
                    </Pressable>
                    <Pressable
                      onPress={() => openWhatsApp(phone)}
                      accessibilityLabel={`WhatsApp ${formatPhone(phone)}`}
                      hitSlop={hitSlopFor(theme.layout.controlHeight)}
                      style={styles.iconButton}
                    >
                      <MessageCircle
                        size={theme.layout.iconMd}
                        color={theme.colors.blue}
                        strokeWidth={2}
                      />
                    </Pressable>
                  </View>
                }
              />
            ))}
          </ListGroup>
        </View>
      )}

      <View style={styles.row}>
        <KpiCard label="Commandes" value={String(list.length)} />
        <KpiCard label="Achats" value={formatAr(spent)} />
      </View>

      <View style={styles.section}>
        <SectionHeader title="Commandes" />
        {orders.isPending && <ActivityIndicator color={theme.colors.ink} />}
        {orders.isSuccess && list.length === 0 && (
          <EmptyState message="Aucune commande pour ce client." />
        )}
        {list.map((order) => (
          <OrderRow
            key={order.id}
            order={order}
            hideCustomer
            onPress={() => router.push(`/orders/${order.id}`)}
          />
        ))}
      </View>

      {deleteError && <InlineBanner tone="danger" message={deleteError} />}
      {list.length === 0 && orders.isSuccess && (
        <Button
          label="Supprimer le client"
          variant="danger"
          fullWidth
          loading={deleteCustomer.isPending}
          onPress={confirmDelete}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
  },
  quickRow: {
    flexDirection: 'row',
    gap: theme.spacing[2],
  },
  quick: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing[1],
    minHeight: theme.layout.rowMinHeight,
    paddingVertical: theme.spacing[2],
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceRaised,
  },
  section: {
    gap: theme.spacing[2],
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing[3],
  },
  phoneActions: {
    flexDirection: 'row',
    gap: theme.spacing[2],
  },
  iconButton: {
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
  disabled: {
    opacity: theme.layout.pressedOpacity / 2,
  },
  pressed: {
    opacity: theme.layout.pressedOpacity,
  },
});
