import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/theme';

import { ShopSwitcher } from './shop-switcher';

/**
 * Navy header bar of a tab: full width, drawn under the status bar, holding only the
 * active shop. The screen title lives in the content (PageTitle). Pass it to <Screen header={...}>.
 */
export function ScreenHeader() {
  const insets = useSafeAreaInsets();
  // Light status bar icons on navy; pushed screens (light header) get dark icons back.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, []),
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top + theme.spacing[1] }]}>
      <ShopSwitcher />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: theme.spacing[4],
    paddingBottom: theme.spacing[3],
    backgroundColor: theme.colors.navy,
  },
});
