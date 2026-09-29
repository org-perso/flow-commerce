import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AlertBanner, AppText, Button } from '@/components/ui';
import { theme } from '@/theme';

import { authErrorMessage } from './auth-errors';
import { isGoogleSignInAvailable, isGoogleSignInInProgress, signInWithGoogle } from './google-auth';

/** "or" separator + Google button. Renders nothing where Google Sign-In is unavailable (Expo Go). */
export function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  if (!isGoogleSignInAvailable) return null;

  // On success, the root layout's auth guard redirects to the app.
  const handlePress = async () => {
    setError(undefined);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      if (!isGoogleSignInInProgress(e)) setError(authErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.separator}>
        <View style={styles.line} />
        <AppText variant="caption" color="inkMuted">
          ou
        </AppText>
        <View style={styles.line} />
      </View>
      {error && <AlertBanner tone="danger" message={error} />}
      <Button label="Continuer avec Google" fullWidth loading={loading} onPress={handlePress} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: theme.spacing[4],
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.line,
  },
});
