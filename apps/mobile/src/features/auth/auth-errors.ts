import { FirebaseError } from 'firebase/app';

const messages: Record<string, string> = {
  'auth/email-already-in-use': 'Un compte existe déjà avec cet email.',
  'auth/invalid-email': "L'adresse email n'est pas valide.",
  'auth/weak-password': 'Le mot de passe doit contenir au moins 6 caractères.',
  'auth/invalid-credential': 'Email ou mot de passe incorrect.',
  'auth/user-disabled': 'Ce compte a été désactivé.',
  'auth/too-many-requests': 'Trop de tentatives. Réessayez dans quelques minutes.',
  'auth/account-exists-with-different-credential':
    'Un compte existe déjà avec cet email. Connectez-vous avec votre mot de passe.',
  'auth/network-request-failed': 'Pas de connexion internet. Vérifiez votre réseau.',
};

export function authErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError && messages[error.code]) return messages[error.code]!;
  return 'Une erreur est survenue. Réessayez.';
}
