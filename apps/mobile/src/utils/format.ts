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

const dateTimeFormat = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Indian/Antananarivo',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

/** "29 sept., 14:05" in Madagascar time. */
export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso));
}

/** Day of a timestamp in Madagascar, as YYYY-MM-DD (today by default). */
export function businessDate(date: string | Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Indian/Antananarivo' }).format(
    new Date(date),
  );
}

/** Current time in Madagascar, as HH:MM (24 h). */
export function businessNow(): string {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Indian/Antananarivo',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date());
}

/** "14:00" → "14h", "14:30" → "14h30". */
export function formatHour(hhmm: string): string {
  const [h, m] = hhmm.split(':');
  return `${Number(h)}h${m === '00' ? '' : m}`;
}

/** Today in Madagascar, as YYYY-MM-DD. */
export function businessToday(): string {
  return businessDate();
}

/** "2026-09-29" → "29/09/2026" */
export function isoToFrDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** "29/09/2026" → "2026-09-29", or null if not a real date. */
export function frDateToIso(text: string): string | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const [, d, m, y] = match.map(Number) as [number, number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return date.toISOString().slice(0, 10);
}

/** First and last day (YYYY-MM-DD) of the month containing `iso`, shifted by `offset` months. */
export function monthRange(iso: string, offset = 0): { from: string; to: string } {
  const [y, m] = iso.split('-').map(Number) as [number, number];
  const first = new Date(Date.UTC(y, m - 1 + offset, 1));
  const last = new Date(Date.UTC(y, m + offset, 0));
  return { from: first.toISOString().slice(0, 10), to: last.toISOString().slice(0, 10) };
}

/** "0341234567" → "034 12 345 67" (Madagascar mobile format); other numbers unchanged. */
export function formatPhone(phone: string): string {
  const m = /^(0\d{2})(\d{2})(\d{3})(\d{2})$/.exec(phone);
  return m ? m.slice(1).join(' ') : phone;
}

const TZ = 'Indian/Antananarivo';
const dayKey = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(date);
const timeFormat = new Intl.DateTimeFormat('fr-FR', {
  timeZone: TZ,
  hour: '2-digit',
  minute: '2-digit',
});
const dayMonthFormat = new Intl.DateTimeFormat('fr-FR', {
  timeZone: TZ,
  day: '2-digit',
  month: '2-digit',
});
const longDayFormat = new Intl.DateTimeFormat('fr-FR', {
  timeZone: TZ,
  day: 'numeric',
  month: 'long',
});

/** Calendar day relative to today in Madagascar: 0 today, 1 yesterday, … */
function daysAgo(date: Date, now: Date): number {
  const a = Date.parse(dayKey(date));
  const b = Date.parse(dayKey(now));
  return Math.round((b - a) / 86_400_000);
}

export function formatTime(date: string | Date): string {
  return timeFormat.format(new Date(date));
}

/** "14:32" today, "Hier" yesterday, otherwise "25/09". */
export function formatRelativeDate(date: string | Date, now = new Date()): string {
  const d = new Date(date);
  const ago = daysAgo(d, now);
  if (ago === 0) return timeFormat.format(d);
  if (ago === 1) return 'Hier';
  return dayMonthFormat.format(d);
}

/**
 * Groups items by calendar day (Madagascar time), newest first as given:
 * sections titled "Aujourd'hui", "Hier", "25 septembre".
 */
export function groupByDay<T>(
  items: T[],
  getDate: (item: T) => string | Date,
  now = new Date(),
): { title: string; data: T[] }[] {
  const sections: { key: string; title: string; data: T[] }[] = [];
  for (const item of items) {
    const date = new Date(getDate(item));
    const key = dayKey(date);
    let section = sections.find((s) => s.key === key);
    if (!section) {
      const ago = daysAgo(date, now);
      const title = ago === 0 ? "Aujourd'hui" : ago === 1 ? 'Hier' : longDayFormat.format(date);
      section = { key, title, data: [] };
      sections.push(section);
    }
    section.data.push(item);
  }
  return sections.map(({ title, data }) => ({ title, data }));
}

/** YYYY-MM-DD shifted by `days`. */
export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const weekdayFormat = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'UTC',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

/** Planned day for humans: "Aujourd'hui", "Demain", "Hier", else "mer. 1 oct.". */
export function formatDayLabel(iso: string, today = businessToday()): string {
  if (iso === today) return "Aujourd'hui";
  if (iso === addDays(today, 1)) return 'Demain';
  if (iso === addDays(today, -1)) return 'Hier';
  return weekdayFormat.format(new Date(`${iso}T00:00:00Z`));
}
