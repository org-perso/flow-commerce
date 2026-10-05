"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { getFirebaseAuth } from "@/lib/firebase";

type AuthState = { user: User | null; loading: boolean; reload: () => void };

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  reload: () => {},
});

/** Firebase session for the whole app (persisted in the browser). */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    user: User | null;
    loading: boolean;
    version: number;
  }>({
    user: null,
    loading: true,
    version: 0,
  });

  useEffect(() => {
    return onAuthStateChanged(getFirebaseAuth(), (user) =>
      setState((s) => ({ user, loading: false, version: s.version + 1 })),
    );
  }, []);

  // `version` changes after user.reload() so that emailVerified is read again.
  const reload = () =>
    setState((s) => ({
      ...s,
      user: getFirebaseAuth().currentUser,
      version: s.version + 1,
    }));

  return (
    <AuthContext.Provider
      value={{ user: state.user, loading: state.loading, reload }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
