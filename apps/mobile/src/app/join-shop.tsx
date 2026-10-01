import { router } from 'expo-router';

import { Screen } from '@/components/ui';
import { JoinForm } from '@/features/team/join-form';

/** Joins another shop from the app; it becomes the active shop. */
export default function JoinShopScreen() {
  return (
    <Screen edges={[]}>
      <JoinForm onJoined={() => router.dismissTo('/')} />
    </Screen>
  );
}
