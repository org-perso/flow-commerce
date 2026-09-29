import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';

import { auth } from '@/lib/firebase';
import { queryClient } from '@/lib/query-client';

import { signOutFromGoogle } from './google-auth';
import { notifyUserReloaded } from './auth-store';

export async function signUp(email: string, password: string) {
  const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await sendEmailVerification(user);
}

export async function signIn(email: string, password: string) {
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function signOut() {
  try {
    await signOutFromGoogle();
  } finally {
    // Always end the Firebase session, even if clearing the Google account fails.
    await firebaseSignOut(auth);
    queryClient.clear();
  }
}

export function sendPasswordReset(email: string) {
  return sendPasswordResetEmail(auth, email.trim());
}

export async function resendVerificationEmail() {
  if (auth.currentUser) await sendEmailVerification(auth.currentUser);
}

/** Reloads the user from Firebase; returns true if the email is now verified. */
export async function refreshEmailVerified() {
  const user = auth.currentUser;
  if (!user) return false;
  await user.reload();
  notifyUserReloaded();
  return user.emailVerified;
}
