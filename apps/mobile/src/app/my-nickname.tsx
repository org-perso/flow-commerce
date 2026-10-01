import { router } from 'expo-router';
import { useState } from 'react';

import { FormScreen, TextField } from '@/components/ui';
import { useAuthStore } from '@/features/auth/auth-store';
import { useActiveShop, useSetMyNickname } from '@/features/shop/use-shop';
import { apiErrorMessage } from '@/lib/api-client';

/** My pseudo in the active shop: what the team sees instead of my email (unique per shop). */
export default function MyNicknameScreen() {
  const shop = useActiveShop();
  const accountName = useAuthStore((s) => s.user?.displayName ?? '');
  const save = useSetMyNickname();
  const [nickname, setNickname] = useState(shop.nickname ?? accountName);
  const value = nickname.trim();
  const tooShort = value.length > 0 && value.length < 2;

  return (
    <FormScreen
      submitLabel="Enregistrer"
      submitting={save.isPending}
      error={save.error ? apiErrorMessage(save.error) : undefined}
      onSubmit={() => !tooShort && save.mutate(value || null, { onSuccess: () => router.back() })}
    >
      <TextField
        label={`Mon pseudo dans ${shop.name}`}
        value={nickname}
        onChangeText={setNickname}
        placeholder="Ex. Rado moto"
        autoCapitalize="words"
        maxLength={30}
        error={tooShort ? '2 caractères au moins.' : undefined}
        hint="Ce que voit l’équipe sur les livraisons et les notifications. Unique dans la boutique. Vide : votre nom de compte."
      />
    </FormScreen>
  );
}
