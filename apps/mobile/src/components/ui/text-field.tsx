import { useState, type Ref } from 'react';
import { Eye, EyeOff } from 'lucide-react-native';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { hitSlopFor, theme } from '@/theme';

import { AppText } from './app-text';

type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  error?: string;
  hint?: string;
  ref?: Ref<TextInput>;
};

export function TextField({
  label,
  error,
  hint,
  onFocus,
  onBlur,
  secureTextEntry,
  ...rest
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  // Password fields get an eye to show what was typed.
  const [revealed, setRevealed] = useState(false);
  const Eyecon = revealed ? EyeOff : Eye;

  return (
    <View style={styles.root}>
      <AppText variant="label">{label}</AppText>
      <View>
        <TextInput
          {...rest}
          secureTextEntry={secureTextEntry && !revealed}
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
          style={[
            styles.input,
            secureTextEntry && styles.withEye,
            focused && styles.focused,
            !!error && styles.invalid,
          ]}
        />
        {secureTextEntry && (
          <Pressable
            onPress={() => setRevealed((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            hitSlop={hitSlopFor(theme.layout.iconMd)}
            style={styles.eye}
          >
            <Eyecon size={theme.layout.iconMd} color={theme.colors.inkMuted} strokeWidth={2} />
          </Pressable>
        )}
      </View>
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
    borderWidth: theme.layout.border,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
  },
  withEye: {
    paddingRight: theme.spacing[3] * 2 + theme.layout.iconMd,
  },
  eye: {
    position: 'absolute',
    right: theme.spacing[3],
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  focused: {
    borderColor: theme.colors.focus,
    borderWidth: 1,
  },
  invalid: {
    borderColor: theme.colors.statusCancelledFg,
  },
});
