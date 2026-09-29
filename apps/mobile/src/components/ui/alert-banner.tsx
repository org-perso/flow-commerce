import { AlertTriangle, CheckCircle2, ChevronRight, XCircle } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';

import { theme } from '@/theme';

import { AppText } from './app-text';

type AlertBannerProps = {
  message: string;
  tone?: 'warning' | 'danger' | 'success';
  onPress?: () => void;
};

const tones = {
  warning: { bg: theme.colors.goldSoft, fg: theme.colors.goldInk, Icon: AlertTriangle },
  danger: { bg: theme.colors.statusCancelledBg, fg: theme.colors.statusCancelledFg, Icon: XCircle },
  success: {
    bg: theme.colors.statusDeliveredBg,
    fg: theme.colors.statusDeliveredFg,
    Icon: CheckCircle2,
  },
} as const;

export function AlertBanner({ message, tone = 'warning', onPress }: AlertBannerProps) {
  const { bg, fg, Icon } = tones[tone];

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'alert'}
      style={({ pressed }) => [styles.banner, { backgroundColor: bg }, pressed && styles.pressed]}
    >
      <Icon size={18} color={fg} strokeWidth={2} />
      <AppText variant="label" style={[styles.message, { color: fg }]}>
        {message}
      </AppText>
      {onPress && <ChevronRight size={18} color={fg} strokeWidth={2} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    minHeight: theme.sizes.tapMin,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: 10,
    borderRadius: theme.radius.md,
  },
  message: {
    flex: 1,
  },
  pressed: {
    opacity: 0.85,
  },
});
