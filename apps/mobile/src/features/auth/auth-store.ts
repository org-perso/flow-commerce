import { onAuthStateChanged, type User } from 'firebase/auth';
import { create } from 'zustand';

import { auth } from '@/lib/firebase';

type AuthState = {
  user: User | null;
  /** False until Firebase has restored the persisted session. */
  initialized: boolean;
  /** Bumped to re-render after user.reload() (the User object is mutated in place). */
  version: number;
};

export const useAuthStore = create<AuthState>(() => ({
  user: null,
  initialized: false,
  version: 0,
}));

onAuthStateChanged(auth, (user) => {
  useAuthStore.setState((s) => ({ user, initialized: true, version: s.version + 1 }));
});

export function notifyUserReloaded() {
  useAuthStore.setState((s) => ({ user: auth.currentUser, version: s.version + 1 }));
}
