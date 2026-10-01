import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { QueryClientProvider } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, AppState, StyleSheet, View } from 'react-native';

import { headerOptions } from '@/components/header-options';
import { AppText, Button } from '@/components/ui';
import { useAuthStore } from '@/features/auth/auth-store';
import { useSetActiveShop, useShops } from '@/features/shop/use-shop';
import { wakeUpApi } from '@/lib/api-client';
import { onNotificationTap, registerForPushNotifications } from '@/lib/push-notifications';
import { queryClient } from '@/lib/query-client';
import { theme } from '@/theme';

SplashScreen.preventAutoHideAsync();
wakeUpApi();
// Also when coming back from the background: the server may have slept in the meantime.
AppState.addEventListener('change', (state) => {
  if (state === 'active') wakeUpApi();
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const authInitialized = useAuthStore((s) => s.initialized);
  const ready = (fontsLoaded || fontError !== null) && authInitialized;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // The navigator is always rendered (the splash screen hides it while loading):
  // expo-router must be mounted from the first render, or it updates an unmounted tree.
  return (
    <QueryClientProvider client={queryClient}>
      <RootNavigator ready={ready} />
    </QueryClientProvider>
  );
}

/** signed out → (auth) · signed in without shop → (onboarding) · with shop → app. */
function RootNavigator({ ready }: { ready: boolean }) {
  const signedIn = useAuthStore((s) => s.user !== null);
  const shopsQuery = useShops();

  const hasShop = signedIn && (shopsQuery.data?.length ?? 0) > 0;
  usePushNotifications(hasShop);
  // Loading and errors cover the navigator instead of replacing it (see RootLayout).
  const overlay = !ready ? null : signedIn && shopsQuery.isPending ? (
    <FullScreenLoader />
  ) : signedIn && shopsQuery.isError ? (
    <FullScreenError onRetry={shopsQuery.refetch} />
  ) : null;

  return (
    <>
      <StatusBar style={hasShop ? 'dark' : 'light'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.surface },
        }}
      >
        <Stack.Protected guard={hasShop}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="shop-switcher"
            options={{
              ...headerOptions('Changer de boutique', { showShop: false }),
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="account"
            options={headerOptions('Compte et boutique', { showShop: false })}
          />
          <Stack.Screen
            name="shop-settings"
            options={headerOptions('Modifier la boutique', { showShop: false })}
          />
          <Stack.Screen
            name="new-shop"
            options={headerOptions('Nouvelle boutique', { showShop: false })}
          />
          <Stack.Screen name="products/new" options={headerOptions('Nouveau produit')} />
          <Stack.Screen name="products/[productId]/index" options={headerOptions('Produit')} />
          <Stack.Screen
            name="products/[productId]/edit"
            options={headerOptions('Modifier le produit')}
          />
          <Stack.Screen name="products/[productId]/movement" options={headerOptions('Stock')} />
          <Stack.Screen name="customers/new" options={headerOptions('Nouveau client')} />
          <Stack.Screen name="customers/[customerId]/index" options={headerOptions('Client')} />
          <Stack.Screen
            name="customers/[customerId]/edit"
            options={headerOptions('Modifier le client')}
          />
          <Stack.Screen name="orders/new" options={headerOptions('Nouvelle commande')} />
          <Stack.Screen name="orders/[orderId]" options={headerOptions('Commande')} />
          <Stack.Screen
            name="orders/edit/[orderId]"
            options={headerOptions('Modifier la commande')}
          />
          <Stack.Screen name="team/index" options={headerOptions('Équipe', { showShop: false })} />
          <Stack.Screen
            name="team/invite"
            options={headerOptions('Inviter', { showShop: false })}
          />
          <Stack.Screen
            name="team/[userId]"
            options={headerOptions('Membre', { showShop: false })}
          />
          <Stack.Screen
            name="my-nickname"
            options={headerOptions('Mon pseudo', { showShop: false })}
          />
          <Stack.Screen
            name="join-shop"
            options={headerOptions('Rejoindre une boutique', { showShop: false })}
          />
          <Stack.Screen name="expenses/index" options={headerOptions('Dépenses')} />
          <Stack.Screen name="expenses/new" options={headerOptions('Nouvelle dépense')} />
          <Stack.Screen name="expenses/[expenseId]" options={headerOptions('Dépense')} />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && !hasShop}>
          <Stack.Screen name="(onboarding)" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
      {overlay}
    </>
  );
}

/**
 * Once in the app: registers the device for push notifications, and opens what a tapped
 * notification is about (switching to its shop first).
 */
function usePushNotifications(inApp: boolean) {
  const uid = useAuthStore((s) => s.user?.uid);
  const setActiveShop = useSetActiveShop();

  useEffect(() => {
    if (inApp) registerForPushNotifications();
  }, [inApp, uid]);

  useEffect(() => {
    if (!inApp) return;
    return onNotificationTap((data) => {
      setActiveShop(data.shopId);
      if (data.type === 'order') router.push(`/orders/${data.orderId}`);
      else router.navigate(data.tab === 'available' ? '/available' : '/deliveries');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- subscribe once inside the app
  }, [inApp]);
}

function FullScreenLoader() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={theme.colors.ink} />
    </View>
  );
}

function FullScreenError({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.center}>
      <AppText variant="heading">Impossible de charger vos boutiques</AppText>
      <AppText color="inkMuted" style={styles.centerText}>
        Vérifiez votre connexion internet puis réessayez.
      </AppText>
      <Button label="Réessayer" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing[3],
    padding: theme.spacing[6],
    backgroundColor: theme.colors.surface,
  },
  centerText: {
    textAlign: 'center',
  },
});
