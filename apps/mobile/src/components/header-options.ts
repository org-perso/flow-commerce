import type { NativeStackNavigationOptions } from 'expo-router';

import { theme } from '@/theme';

/** Native header for pushed screens (forms, details), styled with the design tokens. */
export function headerOptions(title: string): NativeStackNavigationOptions {
  return {
    headerShown: true,
    title,
    headerBackTitle: 'Retour',
    headerTintColor: theme.colors.ink,
    headerTitleStyle: theme.typography.heading,
    headerStyle: { backgroundColor: theme.colors.surface },
    headerShadowVisible: false,
  };
}
