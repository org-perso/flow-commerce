import { router } from 'expo-router';
import { Check, LogOut, Plus, Store, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AlertBanner, AppText, Button, Screen } from '@/components/ui';
import { authErrorMessage } from '@/features/auth/auth-errors';
import { signOut } from '@/features/auth/auth-service';
import { useAuthStore } from '@/features/auth/auth-store';
import { useActiveShop, useSetActiveShop, useShops } from '@/features/shop/use-shop';
import { theme } from '@/theme';

export default function MoreScreen() {
  const email = useAuthStore((s) => s.user?.email);
  const { data: shops = [] } = useShops();
  const activeShop = useActiveShop();
  const setActiveShop = useSetActiveShop();
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

      <View style={styles.section}>
        <AppText variant="heading">{shops.length > 1 ? 'Mes boutiques' : 'Ma boutique'}</AppText>
        <View style={styles.list}>
          {shops.map((shop) => {
            const active = shop.id === activeShop.id;
            return (
              <Pressable
                key={shop.id}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => setActiveShop(shop.id)}
                style={({ pressed }) => [styles.shopRow, pressed && styles.pressed]}
              >
                <Store size={20} color={theme.colors.inkMuted} strokeWidth={2} />
                <View style={styles.shopText}>
                  <AppText style={active && styles.activeName} numberOfLines={1}>
                    {shop.name}
                  </AppText>
                  {shop.description ? (
                    <AppText variant="caption" color="inkMuted" numberOfLines={1}>
                      {shop.description}
                    </AppText>
                  ) : null}
                </View>
                {active && <Check size={20} color={theme.colors.blue} strokeWidth={2} />}
              </Pressable>
            );
          })}
        </View>
        <Button
          label="Modifier la boutique active"
          icon={Store}
          fullWidth
          onPress={() => router.push('/shop-settings')}
        />
        <Button
          label="Créer une autre boutique"
          icon={Plus}
          variant="ghost"
          onPress={() => router.push('/new-shop')}
        />
      </View>

      <View style={styles.section}>
        <AppText variant="heading">Gestion</AppText>
        <Button label="Dépenses" icon={Wallet} fullWidth onPress={() => router.push('/expenses')} />
      </View>

      <View style={styles.section}>
        <AppText variant="heading">Compte</AppText>
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
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: theme.spacing[3],
  },
  list: {
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
  },
  shopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    minHeight: theme.sizes.tapMin + theme.spacing[2],
    paddingHorizontal: theme.spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.line,
  },
  shopText: {
    flex: 1,
  },
  activeName: {
    fontFamily: theme.typography.heading.fontFamily,
  },
  account: {
    gap: theme.spacing[1],
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.md,
    padding: theme.spacing[4],
  },
  pressed: {
    opacity: 0.85,
  },
});
