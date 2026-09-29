const NBSP = ' ';

/** Formats an integer Ariary amount: 450000 → "450 000 Ar" (non-breaking spaces, no decimals). */
export function formatAr(amount: number): string {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? '-' : '';
  const digits = Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return `${sign}${digits}${NBSP}Ar`;
}
