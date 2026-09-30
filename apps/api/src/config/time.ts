/** Business time zone: every "today / week / month" is computed here. */
export const BUSINESS_TZ = 'Indian/Antananarivo';

/** Current date in the business time zone, as YYYY-MM-DD. */
export function businessToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TZ }).format(new Date());
}
