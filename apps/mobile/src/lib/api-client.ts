import { auth } from '@/lib/firebase';

export const apiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') || null;

/** Error built from an RFC 7807 problem response. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly title: string,
    readonly detail?: string,
  ) {
    super(detail ?? title);
  }
}

/** Calls the API with the Firebase ID token; returns null on 204. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!apiUrl) throw new Error('EXPO_PUBLIC_API_URL is not set.');
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
    throw new ApiError(response.status, problem.title ?? response.statusText, problem.detail);
  }
  return (response.status === 204 ? null : await response.json()) as T;
}
