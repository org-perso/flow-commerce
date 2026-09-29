import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { AlertBanner, AppText, Button } from '@/components/ui';
import { AuthScaffold } from '@/features/auth/auth-scaffold';
import { authErrorMessage } from '@/features/auth/auth-errors';
import { signUp } from '@/features/auth/auth-service';
import { FormTextField } from '@/components/form-text-field';
import { GoogleSignInButton } from '@/features/auth/google-sign-in-button';
import { signUpSchema, type SignUpValues } from '@/features/auth/schemas';
import { theme } from '@/theme';

export default function SignUpScreen() {
  const [error, setError] = useState<string>();
  const { control, handleSubmit, formState } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setError(undefined);
    try {
      await signUp(email, password);
    } catch (e) {
      setError(authErrorMessage(e));
    }
  });

  return (
    <AuthScaffold title="Créer un compte" subtitle="Gérez vos ventes en quelques minutes.">
      {error && <AlertBanner tone="danger" message={error} />}
      <FormTextField
        control={control}
        name="email"
        label="Email"
        placeholder="vous@exemple.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <FormTextField
        control={control}
        name="password"
        label="Mot de passe"
        hint="Au moins 8 caractères."
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <FormTextField
        control={control}
        name="confirmPassword"
        label="Confirmer le mot de passe"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        onSubmitEditing={onSubmit}
      />
      <Button
        label="Créer mon compte"
        variant="primary"
        fullWidth
        loading={formState.isSubmitting}
        onPress={onSubmit}
      />
      <GoogleSignInButton />
      <View style={styles.footer}>
        <AppText color="inkMuted">Déjà un compte ?</AppText>
        <Button label="Se connecter" variant="ghost" onPress={() => router.replace('/sign-in')} />
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing[1],
  },
});
