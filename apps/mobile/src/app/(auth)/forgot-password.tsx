import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { AlertBanner, Button } from '@/components/ui';
import { AuthScaffold } from '@/features/auth/auth-scaffold';
import { authErrorMessage } from '@/features/auth/auth-errors';
import { sendPasswordReset } from '@/features/auth/auth-service';
import { FormTextField } from '@/components/form-text-field';
import { forgotPasswordSchema, type ForgotPasswordValues } from '@/features/auth/schemas';

export default function ForgotPasswordScreen() {
  const [result, setResult] = useState<{ tone: 'success' | 'danger'; message: string }>();
  const { control, handleSubmit, formState } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    setResult(undefined);
    try {
      await sendPasswordReset(email);
      // Same message whether or not the account exists (no email enumeration).
      setResult({
        tone: 'success',
        message: 'Si un compte existe pour cet email, un lien de réinitialisation a été envoyé.',
      });
    } catch (e) {
      setResult({ tone: 'danger', message: authErrorMessage(e) });
    }
  });

  return (
    <AuthScaffold
      title="Mot de passe oublié"
      subtitle="Recevez un lien par email pour choisir un nouveau mot de passe."
    >
      {result && <AlertBanner tone={result.tone} message={result.message} />}
      <FormTextField
        control={control}
        name="email"
        label="Email"
        placeholder="vous@exemple.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        onSubmitEditing={onSubmit}
      />
      <Button
        label="Envoyer le lien"
        variant="primary"
        fullWidth
        loading={formState.isSubmitting}
        onPress={onSubmit}
      />
      <Button label="Retour à la connexion" variant="ghost" onPress={() => router.back()} />
    </AuthScaffold>
  );
}
