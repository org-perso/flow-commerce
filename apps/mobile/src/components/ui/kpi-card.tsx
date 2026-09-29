import { Pressable, StyleSheet } from 'react-native';

import { theme } from '@/theme';

import { AppText } from './app-text';

type KpiCardProps = {
  label: string;
  value: string;
  variant?: 'hero' | 'default';
  caption?: string;
  onPress?: () => void;
};

export function KpiCard({ label, value, variant = 'default', caption, onPress }: KpiCardProps) {
  const hero = variant === 'hero';

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [hero ? styles.hero : styles.default, pressed && styles.pressed]}
    >
      <AppText variant={hero ? 'label' : 'caption'} color={hero ? 'onNavyMuted' : 'inkMuted'}>
        {label}
      </AppText>
      <AppText
        variant={hero ? 'amountXl' : 'amountMd'}
        color={hero ? 'onNavy' : 'ink'}
        style={styles.value}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </AppText>
      {caption && (
        <AppText variant="label" color={hero ? 'onNavyMuted' : 'inkMuted'} style={styles.value}>
          {caption}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: theme.colors.navy,
    borderRadius: theme.radius.lg,
    padding: theme.spacing[4],
  },
  default: {
    flex: 1,
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.md,
    padding: theme.spacing[3],
  },
  value: {
    marginTop: theme.spacing[1],
  },
  pressed: {
    opacity: 0.85,
  },
});
