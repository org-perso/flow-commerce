import { Text, type TextProps } from 'react-native';

import { textStyles, theme } from '@/theme';

type AppTextProps = TextProps & {
  variant?: keyof typeof theme.typography;
  color?: keyof typeof theme.colors;
};

export function AppText({ variant = 'body', color = 'ink', style, ...rest }: AppTextProps) {
  const variantStyle = textStyles[variant];
  return <Text style={[variantStyle, { color: theme.colors[color] }, style]} {...rest} />;
}
