import { Check } from 'lucide-react-native';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { theme } from '@/theme';

/** Public page of the privacy policy (required by the Play Store). */
export const PRIVACY_POLICY_URL = 'https://flowcommerce.mg/confidentialite';

const openPolicy = () => Linking.openURL(PRIVACY_POLICY_URL);

function PolicyLink() {
  return (
    <AppText variant="caption" color="link" onPress={openPolicy} accessibilityRole="link">
      politique de confidentialité
    </AppText>
  );
}

/** Sign-up consent: a checkbox that must be ticked before the account is created. */
export function TermsConsent({
  accepted,
  onChange,
  error,
}: {
  accepted: boolean;
  onChange: (accepted: boolean) => void;
  error?: string;
}) {
  return (
    <View style={styles.root}>
      <Pressable
        onPress={() => onChange(!accepted)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: accepted }}
        hitSlop={theme.spacing[2]}
        style={styles.row}
      >
        <View style={[styles.box, accepted && styles.boxChecked, !!error && styles.boxInvalid]}>
          {accepted && <Check size={16} color={theme.colors.onNavy} strokeWidth={3} />}
        </View>
        <AppText variant="caption" color="inkMuted" style={styles.text}>
          J’ai lu et j’accepte la <PolicyLink />.
        </AppText>
      </Pressable>
      {error && (
        <AppText variant="caption" color="statusCancelledFg">
          {error}
        </AppText>
      )}
    </View>
  );
}

/** Same consent for Google: continuing means accepting. */
export function TermsNotice() {
  return (
    <AppText variant="caption" color="inkMuted" style={styles.notice}>
      En continuant avec Google, vous acceptez la <PolicyLink />.
    </AppText>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: theme.spacing[1],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
  },
  box: {
    width: theme.spacing[6],
    height: theme.spacing[6],
    borderRadius: theme.radius.sm,
    borderWidth: theme.layout.border * 3,
    borderColor: theme.colors.inkMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: {
    backgroundColor: theme.colors.navy,
    borderColor: theme.colors.navy,
  },
  boxInvalid: {
    borderColor: theme.colors.statusCancelledFg,
  },
  text: {
    flex: 1,
  },
  notice: {
    textAlign: 'center',
  },
});
