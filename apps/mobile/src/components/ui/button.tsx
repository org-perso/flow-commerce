import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { theme } from '@/theme';

import { AppText } from './app-text';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: LucideIcon;
  loading?: boolean;
  fullWidth?: boolean;
};

const variantColors = {
  primary: { bg: theme.colors.gold, fg: theme.colors.onGold },
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
}: ButtonProps) {
  const { bg, fg } = variantColors[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: loading, disabled: loading }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg },
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        fullWidth && styles.fullWidth,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        Icon && <Icon size={20} color={fg} strokeWidth={2} />
      )}
      <AppText style={[styles.label, { color: fg }]}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: theme.sizes.tapMin,
    paddingHorizontal: 20,
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
  fullWidth: {
    alignSelf: 'stretch',
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    ...theme.typography.body,
    fontFamily: theme.typography.heading.fontFamily,
  },
});
