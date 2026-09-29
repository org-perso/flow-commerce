import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText, Button } from '@/components/ui';
import { useAuthStore } from '@/features/auth/auth-store';
import { useMyShop } from '@/features/shop/use-shop';
import { queryClient } from '@/lib/query-client';
import { theme } from '@/theme';

SplashScreen.preventAutoHideAsync();

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

  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <RootNavigator />
    </QueryClientProvider>
  );
}

/** signed out → (auth) · signed in without shop → (onboarding) · with shop → app. */
function RootNavigator() {
  const signedIn = useAuthStore((s) => s.user !== null);
  const shopQuery = useMyShop();

  if (signedIn && shopQuery.isPending) return <FullScreenLoader />;
  if (signedIn && shopQuery.isError) return <FullScreenError onRetry={shopQuery.refetch} />;

  const hasShop = signedIn && shopQuery.data != null;

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
            name="shop-settings"
            options={{
              headerShown: true,
              title: 'Ma boutique',
              headerBackTitle: 'Retour',
              headerTintColor: theme.colors.ink,
              headerTitleStyle: theme.typography.heading,
              headerStyle: { backgroundColor: theme.colors.surface },
              headerShadowVisible: false,
            }}
          />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && !hasShop}>
          <Stack.Screen name="(onboarding)" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </>
  );
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
      <AppText variant="heading">Impossible de charger votre boutique</AppText>
      <AppText color="inkMuted" style={styles.centerText}>
        Vérifiez votre connexion internet puis réessayez.
      </AppText>
      <Button label="Réessayer" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
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
