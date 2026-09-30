import Constants from 'expo-constants';
import { router } from 'expo-router';
import {
  ChevronRight,
  Pencil,
  Plus,
  UserRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import {
  AppText,
  InlineBanner,
  ListGroup,
  ListRow,
  PageTitle,
  Screen,
  ScreenHeader,
} from '@/components/ui';
import { authErrorMessage } from '@/features/auth/auth-errors';
import { EmailVerificationBanner } from '@/features/auth/email-verification-banner';
import { signOut } from '@/features/auth/auth-service';
import { useAuthStore } from '@/features/auth/auth-store';
import { theme } from '@/theme';

function RowIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <View style={styles.icon}>
      <Icon size={theme.layout.iconMd} color={theme.colors.inkMuted} strokeWidth={2} />
    </View>
  );
}

const chevron = (
  <ChevronRight size={theme.layout.iconMd} color={theme.colors.inkMuted} strokeWidth={2} />
);

export default function MoreScreen() {
  const email = useAuthStore((s) => s.user?.email);
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

  return (
    <Screen header={<ScreenHeader />}>
      <PageTitle title="Plus" />
      <EmailVerificationBanner />
      <View style={styles.section}>
        <AppText variant="label" color="inkMuted">
          Boutique
        </AppText>
        <ListGroup>
          <ListRow
            leading={<RowIcon icon={Pencil} />}
            title="Modifier la boutique"
            trailing={chevron}
            onPress={() => router.push('/shop-settings')}
          />
          <ListRow
            leading={<RowIcon icon={Plus} />}
            title="Créer une boutique"
            trailing={chevron}
            onPress={() => router.push('/new-shop')}
          />
        </ListGroup>
      </View>

      <View style={styles.section}>
        <AppText variant="label" color="inkMuted">
          Gestion
        </AppText>
        <ListGroup>
          <ListRow
            leading={<RowIcon icon={Wallet} />}
            title="Dépenses"
            trailing={chevron}
            onPress={() => router.push('/expenses')}
          />
        </ListGroup>
      </View>

      <View style={styles.section}>
        <AppText variant="label" color="inkMuted">
          Compte
        </AppText>
        <ListGroup>
          <ListRow
            leading={<RowIcon icon={UserRound} />}
            title="Connecté"
            subtitle={email ?? undefined}
          />
        </ListGroup>
      </View>

      <View style={styles.footer}>
        {error && <InlineBanner tone="danger" message={error} />}
        <Pressable
          onPress={confirmSignOut}
          disabled={signingOut}
          accessibilityRole="button"
          style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}
        >
          <AppText color="statusCancelledFg" style={styles.signOutText}>
            {signingOut ? 'Déconnexion…' : 'Se déconnecter'}
          </AppText>
        </Pressable>
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
  icon: {
    width: theme.layout.avatar,
    height: theme.layout.avatar,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    gap: theme.spacing[2],
    alignItems: 'stretch',
  },
  signOut: {
    minHeight: theme.sizes.tapMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: {
    fontFamily: theme.typography.heading.fontFamily,
  },
  center: {
    textAlign: 'center',
  },
  pressed: {
    opacity: theme.layout.pressedOpacity,
  },
});
