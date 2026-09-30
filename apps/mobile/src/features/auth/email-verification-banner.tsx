import { Mail } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button } from '@/components/ui';
import { theme } from '@/theme';

import { authErrorMessage } from './auth-errors';
import { refreshEmailVerified, resendVerificationEmail } from './auth-service';
import { useAuthStore } from './auth-store';

/** Non-blocking reminder shown while the email is not verified (account screen). */
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
      <View style={styles.message}>
        <Mail size={theme.layout.iconMd} color={theme.colors.goldInk} strokeWidth={2} />
        <AppText color="goldInk" style={styles.flex}>
          Confirmez votre email avec le lien envoyé pour sécuriser votre compte.
        </AppText>
      </View>
      {feedback && (
        <AppText
          variant="caption"
          color={feedback.tone === 'success' ? 'statusDeliveredFg' : 'statusCancelledFg'}
        >
          {feedback.message}
        </AppText>
      )}
      <View style={styles.actions}>
        <View style={styles.flex}>
          <Button
            label="J'ai vérifié"
            fullWidth
            loading={pending === 'check'}
            onPress={() => run('check')}
          />
        </View>
        <View style={styles.flex}>
          <Button
            label="Renvoyer"
            variant="ghost"
            fullWidth
            loading={pending === 'resend'}
            onPress={() => run('resend')}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: theme.spacing[3],
    padding: theme.spacing[4],
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.goldSoft,
  },
  message: {
    flexDirection: 'row',
    gap: theme.spacing[2],
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing[3],
  },
  flex: {
    flex: 1,
  },
});
