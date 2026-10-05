import { FirebaseError } from "firebase/app";

import { env } from "@/lib/env";
import { getFirebaseAuth } from "@/lib/firebase";

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

/** Upload failure whose message is ready for the seller (shown as is). */
export class ImageUploadError extends Error {}

/**
 * Wakes the API up (free hosting sleeps when idle, ~30–60 s to start) as soon as the site
 * opens. Fire and forget: errors are ignored.
 */
export function wakeUpApi(): void {
  if (!env.apiUrl) return;
  fetch(`${env.apiUrl}/api/v1/health`).catch(() => {});
}

/** Calls the API with the Firebase ID token (refreshed by the SDK when expired). */
export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await getFirebaseAuth().currentUser?.getIdToken();

  const response = await fetch(`${env.apiUrl}/api/v1${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    const problem = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    throw new ApiError(
      response.status,
      typeof problem.title === "string" ? problem.title : response.statusText,
      typeof problem.detail === "string" ? problem.detail : undefined,
      problem,
    );
  }
  return (response.status === 204 ? undefined : await response.json()) as T;
}

/** Business errors the API names with a `code` (team, deliveries). */
const CODE_MESSAGES: Record<string, string> = {
  LAST_OWNER:
    "La boutique doit garder au moins un propriétaire. Nommez-en un autre avant.",
  INVITATION_UNKNOWN: "Ce code n’existe pas. Vérifiez-le.",
  INVITATION_EXPIRED:
    "Ce code a déjà été utilisé ou a expiré. Demandez-en un nouveau.",
  ALREADY_MEMBER: "Vous faites déjà partie de cette boutique.",
  ALREADY_TAKEN: "Un autre livreur l’a déjà prise.",
  NOT_A_DELIVERY: "Seule une commande avec livraison peut avoir un livreur.",
  NOT_A_DRIVER: "Ce membre n’est pas livreur.",
  ORDER_DONE: "Cette commande est déjà terminée.",
  NICKNAME_TAKEN:
    "Ce pseudo est déjà utilisé dans cette boutique. Choisissez-en un autre.",
};

/** User-facing French message for any error thrown by apiFetch. */
export function apiErrorMessage(error: unknown): string {
  if (error instanceof ImageUploadError) return error.message;
  if (error instanceof FirebaseError && error.code.startsWith("storage/")) {
    return "Impossible d’envoyer la photo. Vérifiez votre connexion et réessayez.";
  }
  if (error instanceof TypeError)
    return "Serveur injoignable. Vérifiez votre connexion.";
  if (error instanceof ApiError) {
    const code =
      typeof error.body.code === "string" ? error.body.code : undefined;
    if (code && code in CODE_MESSAGES) return CODE_MESSAGES[code]!;
    if (error.status === 403) return "Votre rôle ne permet pas cette action.";
    if (error.status === 401) return "Session expirée. Reconnectez-vous.";
    if (error.status === 404) return "Élément introuvable.";
    if (error.status >= 500)
      return "Le serveur a rencontré un problème. Réessayez.";
  }
  return "Une erreur est survenue. Réessayez.";
}

/** Builds "?a=1&b=2" from defined values only. */
export function queryString(
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (
      value === undefined ||
      value === null ||
      value === "" ||
      value === false
    )
      continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}
