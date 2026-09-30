import Constants from 'expo-constants';
import { router } from 'expo-router';
import {
  ArrowLeftRight,
  ChevronRight,
  LogOut,
  Store,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText, Avatar, InlineBanner, ListGroup, ListRow, Screen } from '@/components/ui';
import { authErrorMessage } from '@/features/auth/auth-errors';
import { signOut } from '@/features/auth/auth-service';
import { useAuthStore } from '@/features/auth/auth-store';
import { EmailVerificationBanner } from '@/features/auth/email-verification-banner';
import { useExpenses } from '@/features/expense/use-expenses';
import { useActiveShop } from '@/features/shop/use-shop';
import { theme } from '@/theme';
import { businessToday, formatAr, monthRange } from '@/utils/format';

function RowIcon({
  icon: Icon,
  color = theme.colors.inkMuted,
}: {
  icon: LucideIcon;
  color?: string;
}) {
  return <Icon size={theme.layout.iconMd} color={color} strokeWidth={2} />;
}

function GroupLabel({ children }: { children: string }) {
  return (
    <AppText variant="label" color="inkMuted" style={styles.groupLabel}>
      {children.toUpperCase()}
    </AppText>
  );
}

const chevron = (
  <ChevronRight size={theme.layout.iconMd} color={theme.colors.inkMuted} strokeWidth={2} />
);

/** Account, active shop and management links (opened from the header avatar). */
export default function AccountScreen() {
  const user = useAuthStore((s) => s.user);
  useAuthStore((s) => s.version);
  const shop = useActiveShop();
  const monthExpenses = useExpenses(monthRange(businessToday()));
  const [error, setError] = useState<string>();
  const [signingOut, setSigningOut] = useState(false);

  const confirmSignOut = () =>
    Alert.alert('Se déconnecter ?', 'Vous devrez vous reconnecter pour accéder à vos boutiques.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Se déconnecter',
        style: 'destructive',
        onPress: async () => {
          setError(undefined);
          setSigningOut(true);
          try {
            await signOut();
          } catch (e) {
            setError(authErrorMessage(e));
            setSigningOut(false);
          }
        },
      },
    ]);

  const name = user?.displayName || user?.email || 'Mon compte';

  return (
    <Screen edges={[]}>
      <View style={styles.section}>
        <ListGroup>
          <ListRow
            leading={<Avatar name={name} />}
            title={user?.email ?? name}
            subtitle={user?.emailVerified ? 'Email vérifié' : 'Email non vérifié'}
          />
        </ListGroup>
        <EmailVerificationBanner />
      </View>

      <View style={styles.section}>
        <GroupLabel>Boutique</GroupLabel>
        <ListGroup>
          <ListRow
            leading={<RowIcon icon={Store} />}
            title={shop.name}
            subtitle="Boutique active · modifier"
            trailing={chevron}
            onPress={() => router.push('/shop-settings')}
          />
          <ListRow
            leading={<RowIcon icon={ArrowLeftRight} />}
            title="Changer ou créer une boutique"
            trailing={chevron}
            onPress={() => router.push('/shop-switcher')}
          />
        </ListGroup>
      </View>

      <View style={styles.section}>
        <GroupLabel>Gestion</GroupLabel>
        <ListGroup>
          <ListRow
            leading={<RowIcon icon={Wallet} />}
            title="Dépenses"
            subtitle={
              monthExpenses.data ? `${formatAr(monthExpenses.data.total)} ce mois-ci` : undefined
            }
            trailing={chevron}
            onPress={() => router.push('/expenses')}
          />
        </ListGroup>
      </View>

      <View style={styles.section}>
        {error && <InlineBanner tone="danger" message={error} />}
        <ListGroup>
          <ListRow
            leading={<RowIcon icon={LogOut} color={theme.colors.statusCancelledFg} />}
            title={signingOut ? 'Déconnexion…' : 'Se déconnecter'}
            titleColor="statusCancelledFg"
            onPress={signingOut ? undefined : confirmSignOut}
          />
        </ListGroup>
        <AppText variant="caption" color="inkMuted" style={styles.center}>
          FlowCommerce {Constants.expoConfig?.version ?? ''}
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: theme.spacing[2],
  },
  groupLabel: {
    paddingHorizontal: theme.spacing[1],
  },
  center: {
    textAlign: 'center',
    marginTop: theme.spacing[2],
  },
});
