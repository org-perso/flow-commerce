import Constants, { ExecutionEnvironment } from 'expo-constants';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { Platform } from 'react-native';

import { auth } from '@/lib/firebase';

type GoogleSignInModule = typeof import('@react-native-google-signin/google-signin');

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// The native module does not exist in Expo Go nor on the web: importing it crashes there.
function loadGoogleSignIn(): GoogleSignInModule | null {
  if (isExpoGo || Platform.OS === 'web' || !webClientId) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod: GoogleSignInModule = require('@react-native-google-signin/google-signin');
  mod.GoogleSignin.configure({ webClientId });
  return mod;
}

const google = loadGoogleSignIn();

export const isGoogleSignInAvailable = google !== null;

/** Returns false if the user cancelled the Google dialog. */
export async function signInWithGoogle(): Promise<boolean> {
  if (!google) throw new Error('Google Sign-In is not available in this build.');
  const { GoogleSignin, isSuccessResponse } = google;

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) return false;

  const { idToken } = response.data;
  if (!idToken) throw new Error('Google Sign-In returned no ID token.');
  await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
  return true;
}

/** Clears the cached Google account so the account picker shows again next time. */
export async function signOutFromGoogle() {
  if (google && google.GoogleSignin.hasPreviousSignIn()) await google.GoogleSignin.signOut();
}

/** A second tap while the Google dialog is already open: nothing to report. */
export function isGoogleSignInInProgress(error: unknown) {
  return (
    google !== null &&
    google.isErrorWithCode(error) &&
    error.code === google.statusCodes.IN_PROGRESS
  );
}
