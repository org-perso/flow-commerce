import { useEffect } from 'react';
import { create } from 'zustand';

/**
 * Colors of the order states and of the payment, picked per shop (Paramètres > Couleurs des
 * états). The API stores only the palette keys; the shades live here (and in the web app).
 */
export const PALETTE = {
  gray: { label: 'Gris', bg: '#ECEEF2', fg: '#4A5261' },
  sand: { label: 'Sable', bg: '#F6EEDB', fg: '#8A6A1C' },
  slate: { label: 'Ardoise', bg: '#E5E9F0', fg: '#475569' },
  blue: { label: 'Bleu', bg: '#E3ECFB', fg: '#1E4E9E' },
  indigo: { label: 'Indigo', bg: '#E7E7FB', fg: '#3730A3' },
  cyan: { label: 'Cyan', bg: '#DDF2F6', fg: '#0E7490' },
  amber: { label: 'Ambre', bg: '#FBF0D6', fg: '#7A5608' },
  orange: { label: 'Orange', bg: '#FDE9DC', fg: '#C2410C' },
  yellow: { label: 'Jaune', bg: '#FBF3D0', fg: '#A16207' },
  violet: { label: 'Violet', bg: '#ECE7FD', fg: '#4C2FB3' },
  sky: { label: 'Bleu ciel', bg: '#DFF0FA', fg: '#0369A1' },
  teal: { label: 'Turquoise', bg: '#DBF2EE', fg: '#0F766E' },
  green: { label: 'Vert', bg: '#DDF3E6', fg: '#16693A' },
  emerald: { label: 'Émeraude', bg: '#D8F3E8', fg: '#047857' },
  lime: { label: 'Vert lime', bg: '#EAF3D6', fg: '#4D7C0F' },
  red: { label: 'Rouge', bg: '#FBE3E3', fg: '#9B2C2C' },
  charcoal: { label: 'Gris foncé', bg: '#E6E8EB', fg: '#374151' },
  crimson: { label: 'Rouge vif', bg: '#FCE2E2', fg: '#B91C1C' },
  raspberry: { label: 'Framboise', bg: '#F9E1EC', fg: '#8E2657' },
  rust: { label: 'Orange brûlé', bg: '#FBE6DC', fg: '#9A3412' },
  plum: { label: 'Prune', bg: '#F1E4FA', fg: '#6B21A8' },
  pink: { label: 'Rose', bg: '#FCE4F0', fg: '#BE185D' },
} as const;

export type ColorKey = keyof typeof PALETTE;

export type ColoredState =
  | 'EN_ATTENTE'
  | 'CONFIRMEE'
  | 'EN_PREPARATION'
  | 'EN_LIVRAISON'
  | 'LIVREE'
  | 'ANNULEE'
  | 'RETOUR'
  | 'PAID'
  | 'UNPAID';

export type StatusColors = Partial<Record<ColoredState, ColorKey>>;

/** Each state: its label and 3 suggested colors, the first one being the default. */
export const STATE_COLOR_CHOICES: Record<ColoredState, { label: string; colors: ColorKey[] }> = {
  EN_ATTENTE: { label: 'En attente', colors: ['gray', 'sand', 'slate'] },
  CONFIRMEE: { label: 'Confirmée', colors: ['blue', 'indigo', 'cyan'] },
  EN_PREPARATION: { label: 'En préparation', colors: ['amber', 'orange', 'yellow'] },
  EN_LIVRAISON: { label: 'En livraison', colors: ['violet', 'sky', 'teal'] },
  LIVREE: { label: 'Livrée', colors: ['green', 'emerald', 'lime'] },
  ANNULEE: { label: 'Annulée', colors: ['red', 'charcoal', 'crimson'] },
  RETOUR: { label: 'Retour', colors: ['raspberry', 'rust', 'plum'] },
  PAID: { label: 'Payée', colors: ['pink', 'green', 'blue'] },
  UNPAID: { label: 'Non payée', colors: ['gray', 'orange', 'crimson'] },
};

const useStatusColorsStore = create<{ colors: StatusColors }>(() => ({ colors: {} }));

/** Keeps the active shop's choice in reach of every badge and card (call it once, in the tabs). */
export function useSyncStatusColors(colors: StatusColors | undefined) {
  useEffect(() => {
    useStatusColorsStore.setState({ colors: colors ?? {} });
  }, [colors]);
}

/** Shades of a state for the active shop: its chosen color, or the default one. */
export function useStateColor(state: ColoredState): { bg: string; fg: string } {
  const key = useStatusColorsStore((s) => s.colors[state]);
  return PALETTE[key ?? STATE_COLOR_CHOICES[state].colors[0]!];
}
