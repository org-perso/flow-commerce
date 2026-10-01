import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { Copy, MessageCircle, Share2 } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, Share, StyleSheet, View } from 'react-native';

import { AlertBanner, AppText, Button, ListGroup, ListRow, Screen } from '@/components/ui';
import { canManageRole, ROLE_DESCRIPTIONS, ROLE_LABELS } from '@/features/shop/roles';
import { useActiveShop } from '@/features/shop/use-shop';
import { expiresIn, invitationMessage } from '@/features/team/format';
import type { InvitableRole, Invitation } from '@/features/team/team-api';
import { useCreateInvitation } from '@/features/team/use-team';
import { apiErrorMessage } from '@/lib/api-client';
import { theme } from '@/theme';

const INVITABLE: InvitableRole[] = ['MANAGER', 'CM', 'DRIVER'];

/** Pick a role, then share the 6-character code (F-10). */
export default function InviteScreen() {
  const shop = useActiveShop();
  const create = useCreateInvitation();
  const [invitation, setInvitation] = useState<Invitation>();
  const [copied, setCopied] = useState(false);

  if (!invitation) {
    return (
      <Screen edges={[]}>
        <AppText color="inkMuted">Quel rôle aura la personne invitée ?</AppText>
        {create.isError && <AlertBanner tone="danger" message={apiErrorMessage(create.error)} />}
        <ListGroup>
          {INVITABLE.filter((role) => canManageRole(shop.role, role)).map((role, i) => (
            <ListRow
              key={role}
              divider={i > 0}
              title={ROLE_LABELS[role]}
              subtitle={ROLE_DESCRIPTIONS[role]}
              onPress={
                create.isPending
                  ? undefined
                  : () => create.mutate(role, { onSuccess: setInvitation })
              }
            />
          ))}
        </ListGroup>
      </Screen>
    );
  }

  const message = invitationMessage(shop.name, invitation.role, invitation.code);

  return (
    <Screen
      edges={[]}
      footer={<Button label="Terminé" variant="dark" fullWidth onPress={() => router.back()} />}
    >
      <View style={styles.card}>
        <AppText color="inkMuted">
          Code pour un {ROLE_LABELS[invitation.role].toLowerCase()}
        </AppText>
        <AppText variant="title" style={styles.code} selectable>
          {invitation.code}
        </AppText>
        <AppText variant="caption" color="inkMuted">
          Une seule utilisation · {expiresIn(invitation.expiresAt)}
        </AppText>
      </View>

      <Button
        label="Partager sur WhatsApp"
        icon={MessageCircle}
        variant="primary"
        fullWidth
        onPress={() =>
          Linking.openURL(`whatsapp://send?text=${encodeURIComponent(message)}`).catch(() =>
            Share.share({ message }),
          )
        }
      />
      <Button label="Partager" icon={Share2} fullWidth onPress={() => Share.share({ message })} />
      <Button
        label={copied ? 'Code copié' : 'Copier le code'}
        icon={Copy}
        variant="ghost"
        fullWidth
        onPress={async () => {
          await Clipboard.setStringAsync(invitation.code);
          setCopied(true);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: theme.spacing[2],
    padding: theme.spacing[6],
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: theme.layout.border,
    borderColor: theme.colors.line,
  },
  code: {
    letterSpacing: theme.spacing[2],
  },
});
