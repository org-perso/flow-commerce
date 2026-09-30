import { Pressable, StyleSheet } from 'react-native';

import { hitSlopFor, theme } from '@/theme';

import { AppText } from './app-text';

type InlineBannerProps = {
  message: string;
  tone: 'warning' | 'danger' | 'success';
  action?: { label: string; onPress: () => void };
  onPress?: () => void;
};

const tones = {
  warning: { bg: theme.colors.goldSoft, fg: theme.colors.goldInk },
  danger: { bg: theme.colors.statusCancelledBg, fg: theme.colors.statusCancelledFg },
  success: { bg: theme.colors.statusDeliveredBg, fg: theme.colors.statusDeliveredFg },
} as const;

export function InlineBanner({ message, tone, action, onPress }: InlineBannerProps) {
  const { bg, fg } = tones[tone];
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'alert'}
      style={({ pressed }) => [styles.banner, { backgroundColor: bg }, pressed && styles.pressed]}
    >
      <AppText variant="label" style={[styles.message, { color: fg }]} numberOfLines={2}>
        {message}
      </AppText>
      {action && (
        <Pressable
          onPress={action.onPress}
          accessibilityRole="button"
          hitSlop={hitSlopFor(theme.layout.controlHeight)}
        >
          <AppText variant="label" style={[styles.action, { color: fg }]}>
            {action.label}
          </AppText>
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    minHeight: theme.sizes.tapMin,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.radius.md,
  },
  message: {
    flex: 1,
  },
  action: {
    fontFamily: theme.typography.heading.fontFamily,
    textDecorationLine: 'underline',
  },
  pressed: {
    opacity: theme.layout.pressedOpacity,
  },
});
