import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { theme } from '@/theme';

import { AppText } from './app-text';

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  message?: string;
  action?: ReactNode;
};

export function EmptyState({ icon: Icon, title, message, action }: EmptyStateProps) {
  return (
    <View style={styles.root}>
      <View style={styles.icon}>
        <Icon size={28} color={theme.colors.ink} strokeWidth={2} />
      </View>
      <AppText variant="heading" style={styles.center}>
        {title}
      </AppText>
      {message && (
        <AppText color="inkMuted" style={styles.center}>
          {message}
        </AppText>
      )}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    gap: theme.spacing[2],
    paddingVertical: theme.spacing[8],
    paddingHorizontal: theme.spacing[4],
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.navySoft,
    marginBottom: theme.spacing[2],
  },
  center: {
    textAlign: 'center',
  },
});
