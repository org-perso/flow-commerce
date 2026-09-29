import { Text, type TextProps, type TextStyle } from 'react-native';

import { theme } from '@/theme';

type AppTextProps = TextProps & {
  variant?: keyof typeof theme.typography;
  color?: keyof typeof theme.colors;
};

export function AppText({ variant = 'body', color = 'ink', style, ...rest }: AppTextProps) {
  // Tokens are deeply readonly (`as const`); RN's TextStyle expects a mutable fontVariant array.
  const variantStyle = theme.typography[variant] as TextStyle;
  return <Text style={[variantStyle, { color: theme.colors[color] }, style]} {...rest} />;
}
