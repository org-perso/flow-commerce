import { router } from 'expo-router';
import { ChevronRight, ExternalLink, Mail, ShieldCheck, UserX } from 'lucide-react-native';
import { Linking, StyleSheet, View } from 'react-native';

import { AppText, ListGroup, ListRow, Screen } from '@/components/ui';
import { useAuthStore } from '@/features/auth/auth-store';
import { PRIVACY_POLICY_URL } from '@/features/auth/terms-consent';
import { theme } from '@/theme';

const iconProps = { size: theme.layout.iconMd, strokeWidth: 2 };
const muted = theme.colors.inkMuted;

function GroupLabel({ children }: { children: string }) {
  return (
    <AppText variant="label" color="inkMuted" style={styles.groupLabel}>
      {children.toUpperCase()}
    </AppText>
  );
}

/** What concerns the account itself, not a shop: email, privacy, deletion. */
export default function AccountSettingsScreen() {
  const user = useAuthStore((s) => s.user);
  useAuthStore((s) => s.version);

  return (
    <Screen edges={[]}>
      <View style={styles.section}>
        <GroupLabel>Compte</GroupLabel>
        <ListGroup>
          <ListRow
            leading={<Mail {...iconProps} color={muted} />}
            title={user?.email ?? '—'}
            subtitle={user?.emailVerified ? 'Email vérifié' : 'Email non vérifié'}
          />
        </ListGroup>
      </View>

      <View style={styles.section}>
        <GroupLabel>Confidentialité</GroupLabel>
        <ListGroup>
          <ListRow
            leading={<ShieldCheck {...iconProps} color={muted} />}
            title="Politique de confidentialité"
            trailing={<ExternalLink {...iconProps} color={muted} />}
            onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
          />
        </ListGroup>
      </View>

      <View style={styles.section}>
        <ListGroup>
          <ListRow
            leading={<UserX {...iconProps} color={theme.colors.statusCancelledFg} />}
            title="Supprimer mon compte"
            titleColor="statusCancelledFg"
            trailing={<ChevronRight {...iconProps} color={muted} />}
            onPress={() => router.push('/delete-account')}
          />
        </ListGroup>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: theme.spacing[2],
  },
  groupLabel: {
    paddingHorizontal: theme.spacing[1],
  },
});
