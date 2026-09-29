import { router, Stack, useLocalSearchParams } from 'expo-router';
import { MessageCircle, Pencil, Phone } from 'lucide-react-native';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { AlertBanner, AppText, Button, KpiCard, Screen } from '@/components/ui';
import { callPhone, formatPhone, openWhatsApp } from '@/features/customer/contact';
import { useCustomer, useDeleteCustomer } from '@/features/customer/use-customers';
import { OrderRow } from '@/features/order/order-row';
import { useOrders } from '@/features/order/use-orders';
import { ApiError, apiErrorMessage } from '@/lib/api-client';
import { theme } from '@/theme';
import { formatAr } from '@/utils/format';

const SOLD = ['CONFIRMEE', 'EN_PREPARATION', 'EN_LIVRAISON', 'LIVREE'];

export default function CustomerScreen() {
  const { customerId } = useLocalSearchParams<{ customerId: string }>();
  const customer = useCustomer(customerId);
  const orders = useOrders({ customerId });
  const deleteCustomer = useDeleteCustomer(customerId);

  if (!customer.data) {
    return (
      <Screen edges={[]}>
        {customer.isError ? (
          <AlertBanner tone="danger" message={apiErrorMessage(customer.error)} />
        ) : (
          <ActivityIndicator color={theme.colors.ink} />
        )}
      </Screen>
    );
  }

  const c = customer.data;
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
      <Stack.Screen options={{ title: c.name }} />

      <View style={styles.card}>
        <AppText variant="title">{c.name}</AppText>
        <AppText color="inkMuted">{c.phone ? formatPhone(c.phone) : 'Pas de téléphone'}</AppText>
        {c.address && <AppText>{c.address}</AppText>}
      </View>

      {c.phone && (
        <View style={styles.row}>
          <View style={styles.cell}>
            <Button label="Appeler" icon={Phone} fullWidth onPress={() => callPhone(c.phone!)} />
          </View>
          <View style={styles.cell}>
            <Button
              label="WhatsApp"
              icon={MessageCircle}
              fullWidth
              onPress={() => openWhatsApp(c.phone!)}
            />
          </View>
        </View>
      )}

      <View style={styles.row}>
        <KpiCard label="Commandes" value={String(list.length)} />
        <KpiCard label="Achats" value={formatAr(spent)} />
      </View>

      <View style={styles.section}>
        <AppText variant="heading">Commandes</AppText>
        {orders.isPending && <ActivityIndicator color={theme.colors.ink} />}
        {orders.data?.length === 0 && (
          <AppText color="inkMuted">Aucune commande pour ce client.</AppText>
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

      <View style={styles.section}>
        {deleteError && <AlertBanner tone="danger" message={deleteError} />}
        <Button
          label="Modifier le client"
          icon={Pencil}
          fullWidth
          onPress={() =>
            router.push({ pathname: '/customers/[customerId]/edit', params: { customerId } })
          }
        />
        {list.length === 0 && (
          <Button
            label="Supprimer le client"
            variant="danger"
            fullWidth
            loading={deleteCustomer.isPending}
            onPress={confirmDelete}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: theme.spacing[1],
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.md,
    padding: theme.spacing[4],
  },
  section: {
    gap: theme.spacing[2],
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing[3],
  },
  cell: {
    flex: 1,
  },
});
