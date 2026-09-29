import type { TextStyle } from 'react-native';

import { typography } from './tokens';

export * from './tokens';

/**
 * `typography` typed as React Native text styles. The tokens are deeply readonly
 * (`as const`), which RN's TextStyle rejects for `fontVariant`: use these in StyleSheets.
 */
export const textStyles = typography as unknown as Record<keyof typeof typography, TextStyle>;
