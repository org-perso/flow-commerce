import { ApiError } from '@/lib/api-client';

export function shopErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 409) return 'Vous avez déjà une boutique.';
  if (error instanceof TypeError) return 'Serveur injoignable. Vérifiez votre connexion.';
  return 'Une erreur est survenue. Réessayez.';
}
