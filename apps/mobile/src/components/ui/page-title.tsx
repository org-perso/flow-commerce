import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { theme } from '@/theme';

import { AppText } from './app-text';
import { Button } from './button';

type PageTitleProps = {
  title: string;
  action?: { label: string; icon?: LucideIcon; onPress: () => void };
};

/** Tab screen title, at the top of the content (under the navy shop header). */
export function PageTitle({ title, action }: PageTitleProps) {
  return (
    <View style={styles.root}>
      <AppText variant="title" accessibilityRole="header" style={styles.title} numberOfLines={1}>
        {title}
      </AppText>
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
