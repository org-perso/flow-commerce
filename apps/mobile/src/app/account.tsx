import Constants from 'expo-constants';
import { router } from 'expo-router';
import {
  ArrowLeftRight,
  ChevronRight,
  DoorOpen,
  LogOut,
  Store,
  UserPen,
  Users,
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
import { ROLE_LABELS } from '@/features/shop/roles';
import { useActiveShop, useCan } from '@/features/shop/use-shop';
import { useLeaveShop, useMembers } from '@/features/team/use-team';
import { apiErrorMessage } from '@/lib/api-client';
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
  const canEditShop = useCan('shop.settings');
  const canSeeExpenses = useCan('expenses');
  const canManageTeam = useCan('team');
  const leave = useLeaveShop();
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

  const confirmLeave = () =>
    Alert.alert(`Quitter ${shop.name} ?`, 'Vous n’aurez plus accès à cette boutique.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Quitter',
        style: 'destructive',
        onPress: () => leave.mutate(undefined, { onSuccess: () => router.dismissTo('/') }),
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
            subtitle={
              canEditShop
                ? 'Boutique active · modifier'
                : `Boutique active · ${ROLE_LABELS[shop.role]}`
            }
            trailing={canEditShop ? chevron : undefined}
            onPress={canEditShop ? () => router.push('/shop-settings') : undefined}
          />
          <ListRow
            divider
            leading={<RowIcon icon={UserPen} />}
            title={shop.nickname ?? user?.displayName ?? 'Choisir mon pseudo'}
            subtitle="Mon pseudo dans cette boutique"
            trailing={chevron}
            onPress={() => router.push('/my-nickname')}
          />
          <ListRow
            divider
            leading={<RowIcon icon={ArrowLeftRight} />}
            title="Changer ou créer une boutique"
            trailing={chevron}
            onPress={() => router.push('/shop-switcher')}
          />
        </ListGroup>
      </View>

      {(canManageTeam || canSeeExpenses) && (
        <View style={styles.section}>
          <GroupLabel>Gestion</GroupLabel>
          <ListGroup>
            {canManageTeam && <TeamRow />}
            {canSeeExpenses && <ExpensesRow divider={canManageTeam} />}
          </ListGroup>
        </View>
      )}

      <View style={styles.section}>
        {error && <InlineBanner tone="danger" message={error} />}
        {leave.isError && <InlineBanner tone="danger" message={apiErrorMessage(leave.error)} />}
        <ListGroup>
          <ListRow
            leading={<RowIcon icon={DoorOpen} color={theme.colors.statusCancelledFg} />}
            title={leave.isPending ? 'Départ…' : 'Quitter la boutique'}
            subtitle={shop.name}
            titleColor="statusCancelledFg"
            onPress={leave.isPending ? undefined : confirmLeave}
          />
          <ListRow
            divider
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

function TeamRow() {
  const members = useMembers();
  const count = members.data?.length;
  return (
    <ListRow
      leading={<RowIcon icon={Users} />}
      title="Équipe"
      subtitle={count ? `${count} membre${count > 1 ? 's' : ''}` : undefined}
      trailing={chevron}
      onPress={() => router.push('/team')}
    />
  );
}

/** Its own component: the expenses query only runs for roles that may see them. */
function ExpensesRow({ divider }: { divider: boolean }) {
  const monthExpenses = useExpenses(monthRange(businessToday()));
  return (
    <ListRow
      divider={divider}
      leading={<RowIcon icon={Wallet} />}
      title="Dépenses"
      subtitle={monthExpenses.data ? `${formatAr(monthExpenses.data.total)} ce mois-ci` : undefined}
      trailing={chevron}
      onPress={() => router.push('/expenses')}
    />
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
