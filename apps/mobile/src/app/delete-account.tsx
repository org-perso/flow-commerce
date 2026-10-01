import { FirebaseError } from 'firebase/app';
import { useState } from 'react';

import { AlertBanner, AppText, FormScreen, TextField } from '@/components/ui';
import { deleteMyAccount, usesPassword } from '@/features/auth/account-deletion';
import { authErrorMessage } from '@/features/auth/auth-errors';
import { apiErrorMessage } from '@/lib/api-client';

const CONFIRM_WORD = 'SUPPRIMER';

/** Account deletion (Play Store requirement): typed word, then password or Google again. */
export default function DeleteAccountScreen() {
  const withPassword = usesPassword();
  const [confirm, setConfirm] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string>();

  const confirmed = confirm.trim().toUpperCase() === CONFIRM_WORD;

  // On success the Firebase session ends: the root layout's auth guard goes to sign-in.
  const submit = async () => {
    setSubmitted(true);
    if (!confirmed || (withPassword && !password)) return;
    setError(undefined);
    setDeleting(true);
    try {
      await deleteMyAccount(withPassword ? password : undefined);
    } catch (e) {
      setError(e instanceof FirebaseError ? authErrorMessage(e) : apiErrorMessage(e));
      setDeleting(false);
    }
  };

  return (
    <FormScreen
      submitLabel="Supprimer définitivement"
      submitting={deleting}
      error={error}
      onSubmit={submit}
    >
      <AlertBanner
        tone="danger"
        message="La suppression est définitive : votre compte et vos données seront effacés."
      />
      <AppText color="inkMuted">
        Les boutiques dont vous êtes le seul propriétaire seront supprimées avec tous leurs
        produits, commandes, clients et dépenses, même si d’autres membres y travaillent. Pour
        garder une boutique, nommez d’abord un autre propriétaire dans Équipe.
      </AppText>
      <AppText color="inkMuted">
        Des autres boutiques, vous partirez simplement : elles continuent sans vous.
      </AppText>
      <TextField
        label={`Tapez ${CONFIRM_WORD} pour confirmer`}
        value={confirm}
        onChangeText={setConfirm}
        autoCapitalize="characters"
        autoCorrect={false}
        error={submitted && !confirmed ? `Tapez ${CONFIRM_WORD}.` : undefined}
      />
      {withPassword ? (
        <TextField
          label="Votre mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          error={submitted && !password ? 'Mot de passe requis.' : undefined}
        />
      ) : (
        <AppText variant="caption" color="inkMuted">
          Votre compte Google vous sera redemandé pour confirmer.
        </AppText>
      )}
    </FormScreen>
  );
}
