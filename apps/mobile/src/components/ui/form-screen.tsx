import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { theme } from '@/theme';

import { AlertBanner } from './alert-banner';
import { Button } from './button';
import { Screen } from './screen';

type FormScreenProps = {
  children: ReactNode;
  submitLabel: string;
  onSubmit: () => void;
  submitting: boolean;
  /** Shown right above the submit button, where the eye is when submitting. */
  error?: string;
  /** Under the fields, in the scroll (e.g. a delete button). */
  extra?: ReactNode;
  /** Inside another layout (sign-up flow): no own screen, button after the fields. */
  inline?: boolean;
};

/**
 * Form layout shared by every form: fields scroll, the submit button stays pinned at the
 * bottom of the screen (same place on every form), with the error just above it.
 */
export function FormScreen({
  children,
  submitLabel,
  onSubmit,
  submitting,
  error,
  extra,
  inline,
}: FormScreenProps) {
  const actions = (
    <View style={styles.actions}>
      {error && <AlertBanner tone="danger" message={error} />}
      <Button
        label={submitLabel}
        variant="primary"
        fullWidth
        loading={submitting}
        onPress={onSubmit}
      />
    </View>
  );

  if (inline) {
    return (
      <View style={styles.fields}>
        {children}
        {actions}
        {extra}
      </View>
    );
  }
  return (
    <Screen edges={[]} footer={actions}>
      <View style={styles.fields}>{children}</View>
      {extra}
    </Screen>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: theme.spacing[3],
  },
  actions: {
    gap: theme.spacing[3],
  },
});
