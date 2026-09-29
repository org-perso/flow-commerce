import { Plus } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import {
  AlertBanner,
  AppText,
  Button,
  KpiCard,
  Screen,
  StatusBadge,
  type OrderStatus,
} from '@/components/ui';
import { theme } from '@/theme';
import { EmailVerificationBanner } from '@/features/auth/email-verification-banner';
import { formatAr } from '@/utils/format';

// Static data until the dashboard API exists.
const recentOrders: {
  id: string;
  customer: string;
  summary: string;
  total: number;
  status: OrderStatus;
}[] = [
  {
    id: '1',
    customer: 'Rakoto Jean',
    summary: 'Thé Hibiscus × 3',
    total: 45000,
    status: 'EN_LIVRAISON',
  },
  {
    id: '2',
    customer: 'Rasoa Hanta',
    summary: 'Savon coco × 2',
    total: 18000,
    status: 'EN_ATTENTE',
  },
];

export default function DashboardScreen() {
  return (
    <Screen
      footer={
        <Button
          label="Nouvelle commande"
          icon={Plus}
          variant="primary"
          fullWidth
          onPress={() => {}}
        />
      }
    >
      <EmailVerificationBanner />
      <View style={styles.section}>
        <AppText variant="caption" color="inkMuted">
          Bonjour, Boutique Hery
        </AppText>
        <KpiCard
          variant="hero"
          label="CA aujourd'hui"
          value={formatAr(450000)}
          caption={`Bénéfice estimé · ${formatAr(126000)}`}
        />
        <View style={styles.kpiRow}>
          <KpiCard label="En attente" value="5" onPress={() => {}} />
          <KpiCard label="En livraison" value="12" onPress={() => {}} />
          <KpiCard label="Livrées" value="4" onPress={() => {}} />
        </View>
        <AlertBanner message="3 produits ont un stock faible" onPress={() => {}} />
      </View>

      <View style={styles.list}>
        <AppText variant="heading">Dernières commandes</AppText>
        {recentOrders.map((order) => (
          <View key={order.id} style={styles.orderRow}>
            <View style={styles.orderInfo}>
              <AppText variant="heading" numberOfLines={1} style={styles.customer}>
                {order.customer}
              </AppText>
              <AppText variant="caption" color="inkMuted" numberOfLines={1}>
                {order.summary} · {formatAr(order.total)}
              </AppText>
            </View>
            <StatusBadge status={order.status} />
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: theme.spacing[3],
  },
  kpiRow: {
    flexDirection: 'row',
    gap: theme.spacing[3],
  },
  list: {
    gap: theme.spacing[2],
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing[3],
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.md,
    padding: theme.spacing[3],
  },
  customer: {
    ...theme.typography.body,
    fontFamily: theme.typography.heading.fontFamily,
  },
  orderInfo: {
    flex: 1,
  },
});
