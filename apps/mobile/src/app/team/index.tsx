import { router } from 'expo-router';
import { ChevronRight, Plus } from 'lucide-react-native';
import { Alert, StyleSheet, View } from 'react-native';

import {
  AlertBanner,
  AppText,
  Avatar,
  Button,
  ListGroup,
  ListRow,
  Screen,
  SectionHeader,
} from '@/components/ui';
import { useAuthStore } from '@/features/auth/auth-store';
import { canManageRole, ROLE_LABELS, ROLES } from '@/features/shop/roles';
import { useActiveShop } from '@/features/shop/use-shop';
import { expiresIn, memberName, SECTION_TITLES } from '@/features/team/format';
import { useInvitations, useMembers, useRevokeInvitation } from '@/features/team/use-team';
import { apiErrorMessage } from '@/lib/api-client';
import { theme } from '@/theme';

/** F-10: members by role, pending codes, invite (owner and manager). */
export default function TeamScreen() {
  const shop = useActiveShop();
  const email = useAuthStore((s) => s.user?.email);
  const members = useMembers();
  const invitations = useInvitations();
  const revoke = useRevokeInvitation();

  const confirmRevoke = (id: string, code: string) =>
    Alert.alert(`Annuler le code ${code} ?`, 'Il ne pourra plus être utilisé.', [
      { text: 'Garder', style: 'cancel' },
      { text: 'Annuler le code', style: 'destructive', onPress: () => revoke.mutate(id) },
    ]);

  return (
    <Screen
      edges={[]}
      onRefresh={() => {
        members.refetch();
        invitations.refetch();
      }}
      refreshing={members.isRefetching}
      footer={
        <Button
          label="Inviter"
          icon={Plus}
          variant="primary"
          fullWidth
          onPress={() => router.push('/team/invite')}
        />
      }
    >
      {members.isError && (
        <AlertBanner
          tone="danger"
          message={apiErrorMessage(members.error)}
          onPress={() => members.refetch()}
        />
      )}

      {ROLES.map((role) => {
        const list = members.data?.filter((m) => m.role === role) ?? [];
        if (list.length === 0) return null;
        return (
          <View key={role} style={styles.section}>
            <SectionHeader title={SECTION_TITLES[role]} />
            <ListGroup>
              {list.map((m, i) => {
                const name = memberName(m);
                const isMe = !!email && m.email === email;
                const manageable = !isMe && canManageRole(shop.role, m.role);
                return (
                  <ListRow
                    key={m.userId}
                    divider={i > 0}
                    leading={<Avatar name={name} />}
                    title={isMe ? `${name} (vous)` : name}
                    subtitle={m.name && m.email ? m.email : ROLE_LABELS[m.role]}
                    trailing={
                      manageable ? (
                        <ChevronRight
                          size={theme.layout.iconMd}
                          color={theme.colors.inkMuted}
                          strokeWidth={2}
                        />
                      ) : undefined
                    }
                    onPress={manageable ? () => router.push(`/team/${m.userId}`) : undefined}
                  />
                );
              })}
            </ListGroup>
          </View>
        );
      })}

      {!!invitations.data?.length && (
        <View style={styles.section}>
          <SectionHeader title="Codes en cours" />
          {revoke.isError && <AlertBanner tone="danger" message={apiErrorMessage(revoke.error)} />}
          <ListGroup>
            {invitations.data.map((inv, i) => (
              <ListRow
                key={inv.id}
                divider={i > 0}
                title={inv.code}
                subtitle={`${ROLE_LABELS[inv.role]} · ${expiresIn(inv.expiresAt)}`}
                trailing={
                  <Button
                    label="Annuler"
                    variant="ghost"
                    compact
                    onPress={() => confirmRevoke(inv.id, inv.code)}
                  />
                }
              />
            ))}
          </ListGroup>
        </View>
      )}

      <AppText variant="caption" color="inkMuted" style={styles.hint}>
        Partagez un code d’invitation : la personne le saisit dans l’app pour rejoindre {shop.name}.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: theme.spacing[2],
  },
  hint: {
    textAlign: 'center',
  },
});
