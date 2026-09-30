import { router, useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { Search } from 'lucide-react-native';
import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore } from '@/features/auth/auth-store';
import { hitSlopFor, theme } from '@/theme';

import { AppText } from './app-text';
import { ShopSwitcher } from './shop-switcher';

/**
 * Navy header bar of a tab: the active shop on the left; search and the account on the
 * right. The screen title lives in the content (PageTitle). Pass it to <Screen header={...}>.
 */
export function ScreenHeader() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  useAuthStore((s) => s.version);
  // Light status bar icons on navy; pushed screens (light header) get dark icons back.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, []),
  );

  const letter = (user?.displayName || user?.email || '?').slice(0, 1).toUpperCase();
  const unverified = !!user && !user.emailVerified;

  return (
    <View style={[styles.root, { paddingTop: insets.top + theme.spacing[1] }]}>
      <ShopSwitcher />
      <View style={styles.actions}>
        <Pressable
          onPress={() => router.navigate({ pathname: '/orders', params: { search: '1' } })}
          accessibilityRole="button"
          accessibilityLabel="Rechercher une commande"
          hitSlop={hitSlopFor(theme.layout.shopLogo)}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Search size={theme.layout.iconMd} color={theme.colors.onNavy} strokeWidth={2} />
        </Pressable>
        <Pressable
          onPress={() => router.push('/account')}
          accessibilityRole="button"
          accessibilityLabel={
            unverified ? 'Compte et boutique, email non vérifié' : 'Compte et boutique'
          }
          hitSlop={hitSlopFor(theme.layout.shopLogo)}
          style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
        >
          <AppText variant="caption" color="onNavy" style={styles.avatarText}>
            {letter}
          </AppText>
          {unverified && <View style={styles.badge} />}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    paddingBottom: theme.spacing[2],
    backgroundColor: theme.colors.navy,
  },
  actions: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[4],
  },
  iconButton: {
    width: theme.layout.shopLogo,
    height: theme.layout.shopLogo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: theme.layout.shopLogo,
    height: theme.layout.shopLogo,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.navyRaised,
  },
  avatarText: {
    fontFamily: theme.typography.heading.fontFamily,
  },
  /** Email not verified: a reminder dot, details on the account screen. */
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: theme.layout.dot * 2,
    height: theme.layout.dot * 2,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.gold,
    borderWidth: 2,
    borderColor: theme.colors.navy,
  },
  pressed: {
    opacity: theme.layout.pressedOpacity,
  },
});
