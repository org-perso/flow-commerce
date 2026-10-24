const NBSP = " ";
const TZ = "Indian/Antananarivo";

/** Formats an integer Ariary amount: 450000 → "450 000 Ar" (non-breaking spaces, no decimals). */
export function formatAr(amount: number): string {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? "-" : "";
  const digits = Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return `${sign}${digits}${NBSP}Ar`;
}

const dateTimeFormat = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TZ,
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** "29 sept., 14:05" in Madagascar time. */
export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso));
}

/** Day of a timestamp in Madagascar, as YYYY-MM-DD (today by default). */
export function businessDate(date: string | Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(
    new Date(date),
  );
}

/** Current time in Madagascar, as HH:MM (24 h). */
export function businessNow(): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
}

/** Today in Madagascar, as YYYY-MM-DD. */
export function businessToday(): string {
  return businessDate();
}

/** "14:00" → "14h", "14:30" → "14h30". */
export function formatHour(hhmm: string): string {
  const [h, m] = hhmm.split(":");
  return `${Number(h)}h${m === "00" ? "" : m}`;
}

/** "2026-09-29" → "29/09/2026" */
export function isoToFrDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** First and last day (YYYY-MM-DD) of the month containing `iso`, shifted by `offset` months. */
export function monthRange(
  iso: string,
  offset = 0,
): { from: string; to: string } {
  const [y, m] = iso.split("-").map(Number) as [number, number];
  const first = new Date(Date.UTC(y, m - 1 + offset, 1));
  const last = new Date(Date.UTC(y, m + offset, 0));
  return {
    from: first.toISOString().slice(0, 10),
    to: last.toISOString().slice(0, 10),
  };
}

/** "0341234567" → "034 12 345 67" (Madagascar mobile format); other numbers unchanged. */
export function formatPhone(phone: string): string {
  const m = /^(0\d{2})(\d{2})(\d{3})(\d{2})$/.exec(phone);
  return m ? m.slice(1).join(" ") : phone;
}

export type Operator = "Telma" | "Orange" | "Airtel" | "Autre";

/** Madagascar mobile prefixes. A wrong or new prefix only changes this table. */
const OPERATOR_PREFIXES: Record<string, Exclude<Operator, "Autre">> = {
  "034": "Telma",
  "038": "Telma",
  "032": "Orange",
  "037": "Orange",
  "033": "Airtel",
  "035": "Airtel",
};

/**
 * Network of a number ("+261 34…" and "034…" alike): known as soon as the prefix is typed;
 * "Autre" for a complete number with another prefix; null while it is too short to tell.
 */
export function operatorOf(phone: string): Operator | null {
  const raw = phone.replace(/\D/g, "");
  const digits =
    /^261\d{0,9}$/.test(raw) && raw.length > 3 ? `0${raw.slice(3)}` : raw;
  if (digits.length < 3) return null;
  return (
    OPERATOR_PREFIXES[digits.slice(0, 3)] ??
    (digits.length >= 10 ? "Autre" : null)
  );
}

/** WhatsApp link; wa.me wants the international number without "+". */
export function whatsAppUrl(phone: string): string {
  const international = phone.startsWith("0")
    ? `261${phone.slice(1)}`
    : phone.replace(/^\+/, "");
  return `https://wa.me/${international}`;
}

/** YYYY-MM-DD shifted by `days`. */
export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const weekdayFormat = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
});

/** Planned day for humans: "Aujourd'hui", "Demain", "Hier", else "mer. 1 oct.". */
export function formatDayLabel(iso: string, today = businessToday()): string {
  if (iso === today) return "Aujourd'hui";
  if (iso === addDays(today, 1)) return "Demain";
  if (iso === addDays(today, -1)) return "Hier";
  return weekdayFormat.format(new Date(`${iso}T00:00:00Z`));
}

const longDateFormat = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TZ,
  weekday: "long",
  day: "numeric",
  month: "long",
});

/** "lundi 5 octobre" (today in Madagascar by default). */
export function formatLongDate(date: Date = new Date()): string {
  return longDateFormat.format(date);
}

const shortDateFormat = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** "2026-09-29" → "29 sept. 2026". */
export function formatIsoDate(iso: string): string {
  return shortDateFormat.format(new Date(`${iso}T00:00:00Z`));
}

/** Whole days until a timestamp (negative when past). */
export function daysUntil(iso: string): number {
  return Math.floor((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

/** "s" when n > 1, for French plurals. */
export const plural = (n: number, word: string, pluralWord = `${word}s`) =>
  `${n} ${n > 1 ? pluralWord : word}`;

const timeFormat = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
});
const dayMonthFormat = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TZ,
  day: "2-digit",
  month: "2-digit",
});

/** "14:32" today, "Hier" yesterday, otherwise "25/09" (Madagascar time). */
export function formatRelative(date: string | Date, now = new Date()): string {
  const d = new Date(date);
  const ago = Math.round(
    (Date.parse(businessDate(now)) - Date.parse(businessDate(d))) / 86_400_000,
  );
  if (ago === 0) return timeFormat.format(d);
  if (ago === 1) return "Hier";
  return dayMonthFormat.format(d);
}
