/**
 * Public configuration, inlined by Next.js at build time (NEXT_PUBLIC_*).
 * Each variable must be read with its literal name for the inlining to work.
 */
export const env = {
  apiUrl: (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, ""),
  firebase: {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  },
};

/** Missing variables, listed on a setup screen instead of crashing the app. */
export function missingEnv(): string[] {
  const missing: string[] = [];
  if (!env.apiUrl) missing.push("NEXT_PUBLIC_API_URL");
  if (!env.firebase.apiKey) missing.push("NEXT_PUBLIC_FIREBASE_API_KEY");
  if (!env.firebase.authDomain)
    missing.push("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
  if (!env.firebase.projectId) missing.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  if (!env.firebase.appId) missing.push("NEXT_PUBLIC_FIREBASE_APP_ID");
  return missing;
}
