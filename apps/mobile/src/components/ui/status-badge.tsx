import { StyleSheet, View } from 'react-native';

import { theme } from '@/theme';

import { AppText } from './app-text';

export type OrderStatus = keyof typeof theme.statusColors;

type StatusBadgeProps = { status: OrderStatus; size?: 'sm' | 'md' };

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const { label, bg, fg } = theme.statusColors[status];

  return (
    <View style={[styles.badge, size === 'sm' && styles.sm, { backgroundColor: bg }]}>
      <View style={[styles.dot, { backgroundColor: fg }]} />
      <AppText variant={size === 'sm' ? 'caption' : 'label'} style={[styles.text, { color: fg }]}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: theme.spacing[1],
    paddingHorizontal: 10,
    borderRadius: theme.radius.sm,
  },
  sm: {
    paddingVertical: 2,
    paddingHorizontal: theme.spacing[2],
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontFamily: theme.typography.label.fontFamily,
  },
});
