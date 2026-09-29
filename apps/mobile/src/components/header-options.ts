import { createElement } from 'react';
import type { NativeStackNavigationOptions } from 'expo-router';

import { ActiveShopBadge } from '@/features/shop/active-shop-badge';
import { theme } from '@/theme';

/** Native header for pushed screens (forms, details), styled with the design tokens. */
export function headerOptions(
  title: string,
  { showShop = true }: { showShop?: boolean } = {},
): NativeStackNavigationOptions {
  return {
    headerShown: true,
    title,
    headerBackTitle: 'Retour',
    headerTintColor: theme.colors.ink,
    headerTitleStyle: theme.typography.heading,
    headerStyle: { backgroundColor: theme.colors.surface },
    headerShadowVisible: false,
    // Reminds which shop the screen works on.
    headerRight: showShop ? () => createElement(ActiveShopBadge) : undefined,
  };
}
