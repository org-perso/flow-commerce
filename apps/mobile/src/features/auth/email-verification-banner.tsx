import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AlertBanner, Button } from '@/components/ui';
import { theme } from '@/theme';

import { authErrorMessage } from './auth-errors';
import { refreshEmailVerified, resendVerificationEmail } from './auth-service';
import { useAuthStore } from './auth-store';

/** Non-blocking reminder shown while the email is not verified. */
export function EmailVerificationBanner() {
  const user = useAuthStore((s) => s.user);
  useAuthStore((s) => s.version);
  const [pending, setPending] = useState<'resend' | 'check' | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'danger'; message: string }>();

  if (!user || user.emailVerified) return null;

  const run = async (action: 'resend' | 'check') => {
    setPending(action);
    setFeedback(undefined);
    try {
      if (action === 'resend') {
        await resendVerificationEmail();
        setFeedback({ tone: 'success', message: 'Email de vérification renvoyé.' });
      } else if (!(await refreshEmailVerified())) {
        setFeedback({ tone: 'danger', message: "Votre email n'est pas encore vérifié." });
      }
    } catch (error) {
      setFeedback({ tone: 'danger', message: authErrorMessage(error) });
    } finally {
      setPending(null);
    }
  };

  return (
    <View style={styles.root}>
      <AlertBanner message={`Vérifiez votre email : un lien a été envoyé à ${user.email}.`} />
      {feedback && <AlertBanner tone={feedback.tone} message={feedback.message} />}
      <View style={styles.actions}>
        <Button label="J'ai vérifié" loading={pending === 'check'} onPress={() => run('check')} />
        <Button
          label="Renvoyer l'email"
          variant="ghost"
          loading={pending === 'resend'}
          onPress={() => run('resend')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: theme.spacing[2],
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[2],
  },
});
