import type { ReactNode } from 'react';
import { Keyboard, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';

import { theme } from '@/theme';

type ScreenProps = {
  children: ReactNode;
  /** Safe-area edges to pad; use [] under a native header. */
  edges?: Edge[];
  scroll?: boolean;
  /** Pinned at the bottom (e.g. the primary action). */
  footer?: ReactNode;
  /**
   * Full-width header bar of a tab (ScreenHeader); it handles the top safe area itself.
   * Tab screens sit above the tab bar, so they get no bottom safe-area padding.
   */
  header?: ReactNode;
  /** Enables pull-to-refresh on a scrolling screen. */
  onRefresh?: () => void;
  refreshing?: boolean;
};

export function Screen({
  children,
  scroll = true,
  footer,
  edges,
  header,
  onRefresh,
  refreshing = false,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  // Pushed screens reach the bottom of the display: keep content and buttons above the
  // Android navigation bar / iOS home indicator. Tab screens stop at the tab bar.
  const bottom = header ? 0 : insets.bottom;

  return (
    <SafeAreaView style={styles.root} edges={edges ?? (header ? [] : ['top'])}>
      {header}
      {scroll ? (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            !footer && { paddingBottom: theme.spacing[4] + bottom },
          ]}
          // A tap outside a field closes the keyboard; buttons still get the tap.
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <Pressable
          onPress={Keyboard.dismiss}
          accessible={false}
          style={[styles.content, styles.fill, !footer && { paddingBottom: bottom }]}
        >
          {children}
        </Pressable>
      )}
      {footer && (
        <View style={[styles.footer, { paddingBottom: theme.spacing[3] + bottom }]}>{footer}</View>
      )}
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
    paddingTop: theme.spacing[3],
    borderTopWidth: theme.layout.border,
    borderTopColor: theme.colors.line,
    backgroundColor: theme.colors.surfaceRaised,
  },
});
