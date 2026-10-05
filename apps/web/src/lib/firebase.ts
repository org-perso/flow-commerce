import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  setPersistence,
  type Auth,
} from "firebase/auth";

import { env } from "@/lib/env";

let app: FirebaseApp | undefined;
let authInstance: Auth | undefined;

/**
 * Firebase is only used in the browser (authentication). Created lazily so that
 * prerendering on the server never touches it.
 */
export function getFirebaseAuth(): Auth {
  if (authInstance) return authInstance;
  app = getApps().length ? getApp() : initializeApp(env.firebase);
  authInstance = getAuth(app);
  authInstance.languageCode = "fr";
  void setPersistence(authInstance, browserLocalPersistence);
  return authInstance;
}

/** Storage bucket of the Firebase project (product photos). */
export const storageBucket = () => env.firebase.storageBucket ?? "";
