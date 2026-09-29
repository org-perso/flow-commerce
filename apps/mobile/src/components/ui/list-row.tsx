import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { theme } from '@/theme';

import { AppText } from './app-text';

type ListRowProps = {
  leading?: ReactNode;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  /** Hairline above the row (inset past the leading element). Set by ListGroup. */
  divider?: boolean;
  /** Title color, e.g. for a destructive row. */
  titleColor?: keyof typeof theme.colors;
  accessibilityLabel?: string;
};

export function ListRow({
  leading,
  title,
  subtitle,
  trailing,
  onPress,
  onLongPress,
  divider = false,
  titleColor = 'ink',
  accessibilityLabel,
}: ListRowProps) {
  const interactive = !!(onPress || onLongPress);
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={!interactive}
      accessibilityRole={interactive ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {divider && <View style={[styles.divider, leading ? styles.dividerInset : null]} />}
      {leading}
      <View style={styles.text}>
        <AppText style={styles.title} color={titleColor} numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color="inkMuted" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailing}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    minHeight: theme.layout.rowMinHeight,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    backgroundColor: theme.colors.surfaceRaised,
  },
  divider: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.line,
  },
  dividerInset: {
    left: theme.spacing[4] + theme.layout.avatar + theme.spacing[3],
  },
  text: {
    flex: 1,
    gap: theme.spacing[1] / 2,
  },
  title: {
    fontFamily: theme.typography.heading.fontFamily,
  },
  pressed: {
    opacity: theme.layout.pressedOpacity,
  },
});
