import { Pressable, StyleSheet, View } from 'react-native';

import { hitSlopFor, theme } from '@/theme';

import { AppText } from './app-text';

type SectionHeaderProps = {
  title: string;
  action?: { label: string; onPress: () => void };
};

export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <View style={styles.root}>
      <AppText variant="heading">{title}</AppText>
      {action && (
        <Pressable
          onPress={action.onPress}
          accessibilityRole="button"
          hitSlop={hitSlopFor(theme.layout.controlHeight)}
          style={styles.action}
        >
          <AppText variant="label" color="blue" style={styles.actionText}>
            {action.label}
          </AppText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing[3],
  },
  action: {
    minHeight: theme.layout.controlHeight,
    justifyContent: 'center',
  },
  actionText: {
    fontFamily: theme.typography.heading.fontFamily,
  },
});
