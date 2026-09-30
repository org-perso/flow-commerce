import { FirebaseError } from 'firebase/app';

import { auth } from '@/lib/firebase';

const apiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
if (!apiUrl) {
  throw new Error('Missing EXPO_PUBLIC_API_URL: set it in .env (see .env.example).');
}

/** Error built from an RFC 7807 problem response. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly title: string,
    readonly detail?: string,
    readonly body: Record<string, unknown> = {},
  ) {
    super(detail ?? title);
  }
}

/** Calls the API with the Firebase ID token (refreshed by the SDK when expired). */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await auth.currentUser?.getIdToken();

  const response = await fetch(`${apiUrl}/api/v1${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    const problem = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      problem.title ?? response.statusText,
      problem.detail,
      problem,
    );
  }
  return (response.status === 204 ? undefined : await response.json()) as T;
}

/** User-facing French message for any error thrown by apiFetch. */
export function apiErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError && error.code.startsWith('storage/')) {
    return 'Impossible d’envoyer la photo. Vérifiez votre connexion et réessayez.';
  }
  if (error instanceof TypeError) return 'Serveur injoignable. Vérifiez votre connexion.';
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Session expirée. Reconnectez-vous.';
    if (error.status === 404) return 'Élément introuvable.';
    if (error.status >= 500) return 'Le serveur a rencontré un problème. Réessayez.';
  }
  return 'Une erreur est survenue. Réessayez.';
}
