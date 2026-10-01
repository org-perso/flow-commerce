import { router, useLocalSearchParams } from 'expo-router';
import { Check, UserMinus } from 'lucide-react-native';
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
import { canManageRole, ROLE_DESCRIPTIONS, ROLE_LABELS, ROLES } from '@/features/shop/roles';
import { useActiveShop } from '@/features/shop/use-shop';
import { memberName } from '@/features/team/format';
import { useChangeMemberRole, useMembers, useRemoveMember } from '@/features/team/use-team';
import { apiErrorMessage } from '@/lib/api-client';
import { theme } from '@/theme';

/** A member: change their role or remove them (RG-50, RG-56, RG-58). */
export default function MemberScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const shop = useActiveShop();
  const members = useMembers();
  const changeRole = useChangeMemberRole();
  const remove = useRemoveMember();
  const member = members.data?.find((m) => m.userId === userId);

  if (!member) return <Screen edges={[]}>{null}</Screen>;
  const name = memberName(member);
  const error = changeRole.error ?? remove.error;

  const confirmRemove = () =>
    Alert.alert(
      `Retirer ${name} ?`,
      member.role === 'DRIVER'
        ? 'Il n’aura plus accès à la boutique. Ses livraisons en cours redeviendront à prendre.'
        : 'Il n’aura plus accès à la boutique. Ce qu’il a créé reste dans la boutique.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: () => remove.mutate(member.userId, { onSuccess: () => router.back() }),
        },
      ],
    );

  return (
    <Screen edges={[]}>
      <ListGroup>
        <ListRow
          leading={<Avatar name={name} />}
          title={name}
          subtitle={member.email ?? undefined}
        />
      </ListGroup>

      <View style={styles.section}>
        <SectionHeader title="Rôle" />
        {!!error && <AlertBanner tone="danger" message={apiErrorMessage(error)} />}
        <ListGroup>
          {ROLES.filter((role) => canManageRole(shop.role, role)).map((role, i) => (
            <ListRow
              key={role}
              divider={i > 0}
              title={ROLE_LABELS[role]}
              subtitle={ROLE_DESCRIPTIONS[role]}
              trailing={
                role === member.role ? (
                  <Check size={theme.layout.iconMd} color={theme.colors.blue} strokeWidth={2} />
                ) : undefined
              }
              onPress={
                role === member.role || changeRole.isPending
                  ? undefined
                  : () => changeRole.mutate({ userId: member.userId, role })
              }
            />
          ))}
        </ListGroup>
        {member.role === 'DRIVER' && (
          <AppText variant="caption" color="inkMuted">
            Un livreur qui change de rôle perd ses livraisons en cours.
          </AppText>
        )}
      </View>

      <Button
        label="Retirer de la boutique"
        icon={UserMinus}
        variant="danger"
        fullWidth
        loading={remove.isPending}
        onPress={confirmRemove}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: theme.spacing[2],
  },
});
