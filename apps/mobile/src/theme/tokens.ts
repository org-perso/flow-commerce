// apps/mobile/src/theme/tokens.ts — généré depuis la charte FlowCommerce
export const colors = {
  surface: '#F4F6FA',
  surfaceRaised: '#FFFFFF',
  line: '#D8DEE8',
  ink: '#16325C',
  inkMuted: '#5B6474',
  navy: '#16325C',
  navySoft: '#E6ECF6',
  /** Raised element on navy (header avatar, hero cards). */
  navyRaised: '#2B4A78',
  onNavy: '#FFFFFF',
  onNavyMuted: '#C9D6EE',
  blue: '#1F5BC4',
  gold: '#F2B544',
  goldSoft: '#FFF4DC',
  goldInk: '#8A6A1C',
  onGold: '#16325C',
  statusPendingBg: '#ECEEF2',
  statusPendingFg: '#4A5261',
  statusConfirmedBg: '#E3ECFB',
  statusConfirmedFg: '#1E4E9E',
  statusPreparingBg: '#FBF0D6',
  statusPreparingFg: '#7A5608',
  statusShippingBg: '#ECE7FD',
  statusShippingFg: '#4C2FB3',
  statusDeliveredBg: '#DDF3E6',
  statusDeliveredFg: '#16693A',
  statusCancelledBg: '#FBE3E3',
  statusCancelledFg: '#9B2C2C',
  statusReturnedBg: '#F9E1EC',
  statusReturnedFg: '#8E2657',
  link: '#1F5BC4',
  focus: '#1F5BC4',
} as const;

export const statusColors = {
  EN_ATTENTE: { label: 'En attente', bg: colors.statusPendingBg, fg: colors.statusPendingFg },
  CONFIRMEE: { label: 'Confirmée', bg: colors.statusConfirmedBg, fg: colors.statusConfirmedFg },
  EN_PREPARATION: {
    label: 'En préparation',
    bg: colors.statusPreparingBg,
    fg: colors.statusPreparingFg,
  },
  EN_LIVRAISON: { label: 'En livraison', bg: colors.statusShippingBg, fg: colors.statusShippingFg },
  LIVREE: { label: 'Livrée', bg: colors.statusDeliveredBg, fg: colors.statusDeliveredFg },
  ANNULEE: { label: 'Annulée', bg: colors.statusCancelledBg, fg: colors.statusCancelledFg },
  RETOUR: { label: 'Retour', bg: colors.statusReturnedBg, fg: colors.statusReturnedFg },
} as const;

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  6: 24,
  8: 32,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;

export const sizes = {
  tapMin: 48,
  buttonHeight: 52,
} as const;

// Inter via @expo-google-fonts/inter : Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold
const fam = {
  400: 'Inter_400Regular',
  500: 'Inter_500Medium',
  600: 'Inter_600SemiBold',
  700: 'Inter_700Bold',
} as const;

export const typography = {
  amountXl: {
    fontFamily: fam[700],
    fontSize: 32,
    lineHeight: 38,
    fontVariant: ['tabular-nums'] as const,
  },
  amountMd: {
    fontFamily: fam[600],
    fontSize: 20,
    lineHeight: 26,
    fontVariant: ['tabular-nums'] as const,
  },
  title: { fontFamily: fam[700], fontSize: 22, lineHeight: 28 },
  heading: { fontFamily: fam[600], fontSize: 17, lineHeight: 24 },
  body: { fontFamily: fam[400], fontSize: 15, lineHeight: 22 },
  label: { fontFamily: fam[500], fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fam[400], fontSize: 12, lineHeight: 16 },
} as const;

export const theme = { colors, statusColors, spacing, radius, sizes, typography };
export type Theme = typeof theme;
