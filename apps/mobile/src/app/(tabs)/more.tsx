import { router } from 'expo-router';
import { LogOut, Store } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AlertBanner, AppText, Button, Screen } from '@/components/ui';
import { authErrorMessage } from '@/features/auth/auth-errors';
import { signOut } from '@/features/auth/auth-service';
import { useAuthStore } from '@/features/auth/auth-store';
import { useMyShop } from '@/features/shop/use-shop';
import { theme } from '@/theme';

export default function MoreScreen() {
  const email = useAuthStore((s) => s.user?.email);
  const { data: shop } = useMyShop();
  const [error, setError] = useState<string>();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setError(undefined);
    setSigningOut(true);
    try {
      await signOut();
    } catch (e) {
      setError(authErrorMessage(e));
      setSigningOut(false);
    }
  };

  return (
    <Screen>
      <AppText variant="title">Plus</AppText>
      <View style={styles.account}>
        <AppText variant="caption" color="inkMuted">
          Boutique
        </AppText>
        <AppText variant="heading">{shop?.name}</AppText>
        {shop?.description ? <AppText color="inkMuted">{shop.description}</AppText> : null}
      </View>
      <Button
        label="Modifier la boutique"
        icon={Store}
        fullWidth
        onPress={() => router.push('/shop-settings')}
      />
      <View style={styles.account}>
        <AppText variant="caption" color="inkMuted">
          Connecté en tant que
        </AppText>
        <AppText>{email}</AppText>
      </View>
      {error && <AlertBanner tone="danger" message={error} />}
      <Button
        label="Se déconnecter"
        icon={LogOut}
        fullWidth
        loading={signingOut}
        onPress={handleSignOut}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  account: {
    gap: theme.spacing[1],
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.md,
    padding: theme.spacing[4],
  },
});
