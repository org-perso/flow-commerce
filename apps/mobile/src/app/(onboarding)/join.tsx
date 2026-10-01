import { router } from 'expo-router';

import { Button } from '@/components/ui';
import { AuthScaffold } from '@/features/auth/auth-scaffold';
import { JoinForm } from '@/features/team/join-form';

/** Joining from onboarding: the root guard switches to the app once the shop is listed. */
export default function OnboardingJoinScreen() {
  return (
    <AuthScaffold
      title="Rejoindre une boutique"
      subtitle="Saisissez le code reçu du propriétaire ou du gérant."
    >
      <JoinForm />
      <Button label="Retour" variant="ghost" onPress={() => router.back()} />
    </AuthScaffold>
  );
}
