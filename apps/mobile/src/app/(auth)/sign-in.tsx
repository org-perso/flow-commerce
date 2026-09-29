import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { AlertBanner, AppText, Button } from '@/components/ui';
import { AuthScaffold } from '@/features/auth/auth-scaffold';
import { authErrorMessage } from '@/features/auth/auth-errors';
import { signIn } from '@/features/auth/auth-service';
import { FormTextField } from '@/components/form-text-field';
import { GoogleSignInButton } from '@/features/auth/google-sign-in-button';
import { signInSchema, type SignInValues } from '@/features/auth/schemas';
import { theme } from '@/theme';

export default function SignInScreen() {
  const [error, setError] = useState<string>();
  const { control, handleSubmit, formState } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  // On success, the root layout's auth guard redirects to the app.
  const onSubmit = handleSubmit(async ({ email, password }) => {
    setError(undefined);
    try {
      await signIn(email, password);
    } catch (e) {
      setError(authErrorMessage(e));
    }
  });

  return (
    <AuthScaffold title="Connexion" subtitle="Heureux de vous revoir.">
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
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        onSubmitEditing={onSubmit}
      />
      <Button
        label="Mot de passe oublié ?"
        variant="ghost"
        onPress={() => router.push('/forgot-password')}
      />
      <Button
        label="Se connecter"
        variant="primary"
        fullWidth
        loading={formState.isSubmitting}
        onPress={onSubmit}
      />
      <GoogleSignInButton />
      <View style={styles.footer}>
        <AppText color="inkMuted">Pas encore de compte ?</AppText>
        <Button label="Créer un compte" variant="ghost" onPress={() => router.push('/sign-up')} />
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
