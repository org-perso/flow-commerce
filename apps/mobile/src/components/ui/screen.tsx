import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { theme } from '@/theme';

type ScreenProps = {
  children: ReactNode;
  /** Safe-area edges to pad; use [] under a native header. */
  edges?: Edge[];
  scroll?: boolean;
  /** Pinned at the bottom, above the tab bar (e.g. the primary action). */
  footer?: ReactNode;
  /** Enables pull-to-refresh on a scrolling screen. */
  onRefresh?: () => void;
  refreshing?: boolean;
};

export function Screen({
  children,
  scroll = true,
  footer,
  edges = ['top'],
  onRefresh,
  refreshing = false,
}: ScreenProps) {
  return (
    <SafeAreaView style={styles.root} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fill]}>{children}</View>
      )}
      {footer && <View style={styles.footer}>{footer}</View>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  content: {
    padding: theme.spacing[4],
    gap: theme.spacing[6],
  },
  fill: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
  },
});
