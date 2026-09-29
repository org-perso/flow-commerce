import { useState, type Ref } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { theme } from '@/theme';

import { AppText } from './app-text';

type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  error?: string;
  hint?: string;
  ref?: Ref<TextInput>;
};

export function TextField({ label, error, hint, onFocus, onBlur, ...rest }: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.root}>
      <AppText variant="label">{label}</AppText>
      <TextInput
        {...rest}
        accessibilityLabel={label}
        placeholderTextColor={theme.colors.inkMuted}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[styles.input, focused && styles.focused, !!error && styles.invalid]}
      />
      {error ? (
        <AppText variant="caption" color="statusCancelledFg">
          {error}
        </AppText>
      ) : (
        hint && (
          <AppText variant="caption" color="inkMuted">
            {hint}
          </AppText>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: theme.spacing[1],
  },
  input: {
    ...theme.typography.body,
    color: theme.colors.ink,
    minHeight: theme.sizes.tapMin,
    paddingHorizontal: theme.spacing[3],
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
  },
  focused: {
    borderColor: theme.colors.focus,
    borderWidth: 2,
  },
  invalid: {
    borderColor: theme.colors.statusCancelledFg,
  },
});
