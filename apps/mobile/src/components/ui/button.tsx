import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Keyboard, Pressable, StyleSheet } from 'react-native';

import { hitSlopFor, theme } from '@/theme';

import { AppText } from './app-text';

type ButtonVariant = 'primary' | 'dark' | 'secondary' | 'ghost' | 'danger';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: LucideIcon;
  loading?: boolean;
  fullWidth?: boolean;
  /** Smaller visual size (header actions); the touch area stays ≥ tapMin via hitSlop. */
  compact?: boolean;
};

const variantColors = {
  primary: { bg: theme.colors.gold, fg: theme.colors.onGold },
  /** Strong action that is not the gold one (e.g. an order's next step). */
  dark: { bg: theme.colors.navy, fg: theme.colors.onNavy },
  secondary: { bg: theme.colors.surfaceRaised, fg: theme.colors.ink },
  ghost: { bg: 'transparent', fg: theme.colors.blue },
  danger: { bg: theme.colors.statusCancelledBg, fg: theme.colors.statusCancelledFg },
} as const;

export function Button({
  label,
  onPress,
  variant = 'secondary',
  icon: Icon,
  loading = false,
  fullWidth = false,
  compact = false,
}: ButtonProps) {
  const { bg, fg } = variantColors[variant];
  const iconSize = compact ? theme.layout.iconSm : theme.layout.iconMd;

  return (
    <Pressable
      onPress={() => {
        Keyboard.dismiss();
        onPress();
      }}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: loading, disabled: loading }}
      hitSlop={compact ? hitSlopFor(theme.layout.controlHeight) : undefined}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg },
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        compact && styles.compact,
        fullWidth && styles.fullWidth,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        Icon && <Icon size={iconSize} color={fg} strokeWidth={2} />
      )}
      <AppText style={[compact ? styles.labelCompact : styles.label, { color: fg }]}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: theme.sizes.tapMin,
    paddingHorizontal: theme.spacing[4] + theme.spacing[1],
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing[2],
    alignSelf: 'flex-start',
  },
  primary: {
    height: theme.sizes.buttonHeight,
    paddingHorizontal: theme.spacing[6],
  },
  secondary: {
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  compact: {
    minHeight: theme.layout.controlHeight,
    paddingHorizontal: theme.spacing[3],
    gap: theme.spacing[1],
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  pressed: {
    opacity: theme.layout.pressedOpacity,
  },
  label: {
    ...theme.typography.body,
    fontFamily: theme.typography.heading.fontFamily,
  },
  labelCompact: {
    ...theme.typography.label,
    fontFamily: theme.typography.heading.fontFamily,
  },
});
