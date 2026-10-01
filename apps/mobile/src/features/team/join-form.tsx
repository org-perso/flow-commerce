import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AlertBanner, AppText, Button, TextField } from '@/components/ui';
import { useAuthStore } from '@/features/auth/auth-store';
import { ApiError, apiErrorMessage } from '@/lib/api-client';
import { theme } from '@/theme';

import { ROLE_LABELS } from '../shop/roles';
import type { Shop } from '../shop/shop-api';
import { useJoinShop } from './use-team';

/**
 * Joining a shop (F-11), in two steps: the invitation code, then the pseudo the team will see
 * (prefilled with the account name). Codes have no 0/O or 1/I/L: upper case, forgiving.
 */
export function JoinForm({ onJoined }: { onJoined?: (shop: Shop) => void }) {
  const accountName = useAuthStore((s) => s.user?.displayName ?? '');
  const [step, setStep] = useState<'code' | 'pseudo'>('code');
  const [code, setCode] = useState('');
  const [nickname, setNickname] = useState(accountName);
  const join = useJoinShop();
  const clean = code.replace(/[^a-z0-9]/gi, '').toUpperCase();
  const pseudo = nickname.trim();

  const submit = () =>
    join.mutate(
      { code: clean, nickname: pseudo },
      {
        onSuccess: (shop) => {
          Alert.alert(
            `Bienvenue dans ${shop.name} !`,
            `Vous êtes ${ROLE_LABELS[shop.role].toLowerCase()}, sous le pseudo « ${pseudo} ».`,
          );
          onJoined?.(shop);
        },
        // A wrong or used code: back to the code step, with the message.
        onError: (error) => {
          if (error instanceof ApiError && CODE_ERRORS.includes(String(error.body.code))) {
            setStep('code');
          }
        },
      },
    );

  if (step === 'code') {
    return (
      <View style={styles.root}>
        <TextField
          label="Code d’invitation"
          value={code}
          onChangeText={(v) => setCode(v.toUpperCase())}
          placeholder="Ex. K7M2QX"
          autoCapitalize="characters"
          autoCorrect={false}
          autoFocus
          maxLength={8}
          hint="6 caractères, reçus du propriétaire ou du gérant de la boutique."
          returnKeyType="next"
          onSubmitEditing={clean.length === 6 ? () => setStep('pseudo') : undefined}
        />
        {join.isError && <AlertBanner tone="danger" message={apiErrorMessage(join.error)} />}
        <Button
          label="Continuer"
          variant="primary"
          fullWidth
          onPress={clean.length === 6 ? () => setStep('pseudo') : () => {}}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AppText color="inkMuted">
        Code {clean} · Dernière étape : comment l’équipe vous appellera-t-elle ?
      </AppText>
      <TextField
        label="Votre pseudo dans la boutique"
        value={nickname}
        onChangeText={setNickname}
        placeholder="Ex. Rado moto"
        autoCapitalize="words"
        autoFocus
        maxLength={30}
        error={pseudo.length === 1 ? '2 caractères au moins.' : undefined}
        hint="C’est ce que verra l’équipe (jamais votre email). Unique dans la boutique."
        returnKeyType="done"
        onSubmitEditing={pseudo.length >= 2 ? submit : undefined}
      />
      {join.isError && <AlertBanner tone="danger" message={apiErrorMessage(join.error)} />}
      <Button
        label="Rejoindre la boutique"
        variant="primary"
        fullWidth
        loading={join.isPending}
        onPress={pseudo.length >= 2 ? submit : () => {}}
      />
      <Button label="Changer de code" variant="ghost" onPress={() => setStep('code')} />
    </View>
  );
}

/** Errors about the code itself (the pseudo step cannot fix them). */
const CODE_ERRORS = ['INVITATION_UNKNOWN', 'INVITATION_EXPIRED', 'ALREADY_MEMBER'];

const styles = StyleSheet.create({
  root: {
    gap: theme.spacing[3],
  },
});
