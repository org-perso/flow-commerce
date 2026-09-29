import type { TextStyle } from 'react-native';

import { theme as tokens, typography } from './tokens';

export {
  colors,
  radius,
  sizes,
  spacing,
  statusColors,
  typography,
  type Theme as TokensTheme,
} from './tokens';

/**
 * Design tokens (tokens.ts, copied from the charter) plus layout sizes used by
 * the UI components, so no screen or component hard-codes a dimension.
 */
export const theme = {
  ...tokens,
  layout: {
    /** Avatar / product thumbnail. */
    avatar: 40,
    /** Minimum height of a list row. */
    rowMinHeight: 56,
    /** Visual height of compact controls (segments, chips, compact buttons); hitSlop tops them up to tapMin. */
    controlHeight: 36,
    /** Icon sizes. */
    iconSm: 16,
    iconMd: 20,
    iconLg: 24,
    /** Status dot in badges. */
    dot: 6,
    /** Opacity of a pressed element. */
    pressedOpacity: 0.85,
    /** Tallest reasonable tab label scale-down on small screens. */
    minFontScale: 0.8,
  },
} as const;

export type Theme = typeof theme;

/**
 * `typography` typed as React Native text styles. The tokens are deeply readonly
 * (`as const`), which RN's TextStyle rejects for `fontVariant`: use these in StyleSheets.
 */
export const textStyles = typography as unknown as Record<keyof typeof typography, TextStyle>;

/** hitSlop that brings a control of visual height `height` up to the minimum touch target. */
export function hitSlopFor(height: number) {
  const extra = Math.max(0, (tokens.sizes.tapMin - height) / 2);
  return { top: extra, bottom: extra, left: 0, right: 0 };
}
