import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/theme';

import { AppText } from './app-text';
import { Button } from './button';
import { ShopSwitcher } from './shop-switcher';

type ScreenHeaderProps = {
  /** Screen title under the shop name; omit on the home screen. */
  title?: string;
  action?: { label: string; icon?: LucideIcon; onPress: () => void };
};

/**
 * Header bar of a tab: full width, drawn under the status bar, with the active shop
 * on top and an optional title / compact action below. Pass it to <Screen header={...}>.
 */
export function ScreenHeader({ title, action }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top + theme.spacing[1] }]}>
      <ShopSwitcher />
      {(title || action) && (
        <View style={styles.titleRow}>
          <AppText variant="heading" color="inkMuted" style={styles.title} numberOfLines={1}>
            {title}
          </AppText>
          {action && (
            <Button label={action.label} icon={action.icon} compact onPress={action.onPress} />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: theme.spacing[1],
    paddingHorizontal: theme.spacing[4],
    paddingBottom: theme.spacing[3],
    backgroundColor: theme.colors.surfaceRaised,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.line,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
  },
  title: {
    flex: 1,
  },
});
