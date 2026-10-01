/** Business time zone: every "today / week / month" is computed here. */
export const BUSINESS_TZ = 'Indian/Antananarivo';

/** Current date in the business time zone, as YYYY-MM-DD. */
export function businessToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TZ }).format(new Date());
}

/** Current time in the business time zone, as HH:MM. */
export function businessNow(): string {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: BUSINESS_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date());
}
