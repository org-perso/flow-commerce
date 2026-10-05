import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth";
import type { QueryClient } from "@tanstack/react-query";

import { deleteMe } from "@/features/me/me-api";
import { getFirebaseAuth } from "@/lib/firebase";
import { deleteStoredImage } from "@/lib/product-image";

const googleProvider = () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
};

export async function signUp(email: string, password: string) {
  const { user } = await createUserWithEmailAndPassword(
    getFirebaseAuth(),
    email.trim(),
    password,
  );
  await sendEmailVerification(user);
}

export async function signIn(email: string, password: string) {
  await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
}

/** Returns false if the user closed the Google popup. */
export async function signInWithGoogle(): Promise<boolean> {
  try {
    await signInWithPopup(getFirebaseAuth(), googleProvider());
    return true;
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (
      code === "auth/popup-closed-by-user" ||
      code === "auth/cancelled-popup-request"
    )
      return false;
    throw error;
  }
}

export async function signOut(queryClient: QueryClient) {
  await firebaseSignOut(getFirebaseAuth());
  queryClient.clear();
}

export function sendPasswordReset(email: string) {
  return sendPasswordResetEmail(getFirebaseAuth(), email.trim());
}

export async function resendVerificationEmail() {
  const user = getFirebaseAuth().currentUser;
  if (user) await sendEmailVerification(user);
}

/** Reloads the user from Firebase; returns true if the email is now verified. */
export async function refreshEmailVerified() {
  const user = getFirebaseAuth().currentUser;
  if (!user) return false;
  await user.reload();
  return user.emailVerified;
}

/** Email accounts confirm with their password; Google accounts with the Google popup. */
export function usesPassword(): boolean {
  return !!getFirebaseAuth().currentUser?.providerData.some(
    (p) => p.providerId === "password",
  );
}

/**
 * Deletes the account for good:
 * 1. signs in again first, so Firebase accepts the deletion at the end;
 * 2. the API deletes the data (shops where the user is the only owner included);
 * 3. the photos of those shops are removed from Storage;
 * 4. the Firebase account is deleted, which signs the user out.
 */
export async function deleteMyAccount(
  queryClient: QueryClient,
  password?: string,
): Promise<void> {
  const user = getFirebaseAuth().currentUser;
  if (!user) return;
  if (usesPassword()) {
    await reauthenticateWithCredential(
      user,
      EmailAuthProvider.credential(user.email ?? "", password ?? ""),
    );
  } else {
    await reauthenticateWithPopup(user, googleProvider());
  }
  const { images } = await deleteMe();
  await Promise.all(images.map(deleteStoredImage));
  await deleteUser(user);
  queryClient.clear();
}
