import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { theme } from '@/theme';

import { AppText } from './app-text';
import { Button } from './button';

type PageTitleProps = {
  /** Without a title, `right` sits on the left and the action on the right. */
  title?: string;
  action?: { label: string; icon?: LucideIcon; onPress: () => void };
  /** Any control on the right instead of an action button (e.g. a Dropdown). */
  right?: ReactNode;
};

/** Tab screen title, at the top of the content (under the navy shop header). */
export function PageTitle({ title, action, right }: PageTitleProps) {
  return (
    <View style={styles.root}>
      {title ? (
        <AppText variant="title" accessibilityRole="header" style={styles.title} numberOfLines={1}>
          {title}
        </AppText>
      ) : null}
      {right}
      {!title && <View style={styles.title} />}
      {action && (
        <Button label={action.label} icon={action.icon} compact onPress={action.onPress} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
  },
  title: {
    flex: 1,
  },
});
