import { deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

import { apiFetch } from '@/lib/api-client';
import { auth } from '@/lib/firebase';
import { deleteStoredImage } from '@/lib/product-image';
import { queryClient } from '@/lib/query-client';

import { reauthenticateWithGoogle, signOutFromGoogle } from './google-auth';

/** Email accounts confirm with their password; Google accounts with the Google picker. */
export function usesPassword(): boolean {
  return !!auth.currentUser?.providerData.some((p) => p.providerId === 'password');
}

/**
 * Deletes the account for good (Play Store requirement):
 * 1. signs in again first, so Firebase accepts the deletion at the end;
 * 2. the API deletes the data (shops where the user is the only owner included);
 * 3. the photos of those shops are removed from Storage;
 * 4. the Firebase account is deleted, which signs the user out.
 */
export async function deleteMyAccount(password?: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  if (usesPassword()) {
    await reauthenticateWithCredential(
      user,
      EmailAuthProvider.credential(user.email ?? '', password ?? ''),
    );
  } else {
    await reauthenticateWithGoogle();
  }

  const { images } = await apiFetch<{ images: string[] }>('/me', { method: 'DELETE' });
  await Promise.all(images.map(deleteStoredImage));

  await deleteUser(user);
  await signOutFromGoogle().catch(() => {});
  queryClient.clear();
}
