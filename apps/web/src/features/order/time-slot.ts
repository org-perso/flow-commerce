import { formatHour } from "@/lib/format";

/** Hours of the planned day (HH:MM, Madagascar); null bounds are open ("avant", "après"). */
export type TimeSlot = { from: string | null; to: string | null };

/** One-tap slots; anything else is "Autre…" (before, after, between). */
export const SLOT_PRESETS = [
  { key: "morning", label: "Matin", slot: { from: "08:00", to: "12:00" } },
  { key: "noon", label: "Midi", slot: { from: "12:00", to: "14:00" } },
  {
    key: "afternoon",
    label: "Après-midi",
    slot: { from: "14:00", to: "18:00" },
  },
  { key: "evening", label: "Soir", slot: { from: "18:00", to: "21:00" } },
] as const;

export type SlotPresetKey = (typeof SLOT_PRESETS)[number]["key"];

export function presetOf(slot: TimeSlot | null): SlotPresetKey | null {
  return (
    SLOT_PRESETS.find(
      (p) => p.slot.from === slot?.from && p.slot.to === slot?.to,
    )?.key ?? null
  );
}

/** Hours only, for tight places: "8h–12h", "Avant 11h", "Après 17h"; null for any time. */
export function slotRange(slot: TimeSlot | null): string | null {
  if (!slot || (!slot.from && !slot.to)) return null;
  return slot.from && slot.to
    ? `${formatHour(slot.from)}–${formatHour(slot.to)}`
    : slot.to
      ? `Avant ${formatHour(slot.to)}`
      : `Après ${formatHour(slot.from!)}`;
}

/** "Matin (8h–12h)", "Avant 11h", "Après 17h", "14h–16h"; null for any time. */
export function slotLabel(slot: TimeSlot | null): string | null {
  const range = slotRange(slot);
  if (!range) return null;
  const preset = SLOT_PRESETS.find(
    (p) => p.slot.from === slot!.from && p.slot.to === slot!.to,
  );
  return preset ? `${preset.label} (${range})` : range;
}

/**
 * Typed hour → "HH:MM", or null if it is not an hour: "11", "11h", "14h30", "14:30", "9h05".
 */
export function parseHour(text: string): string | null {
  const match = /^(\d{1,2})\s*(?:[h:.]\s*(\d{2})?)?$/i.exec(text.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Planned day, then the slot ending first ("any time" last): the driver's round order. */
export function byPlannedTime(
  a: { scheduledDate: string; timeSlot: TimeSlot | null },
  b: { scheduledDate: string; timeSlot: TimeSlot | null },
): number {
  return (
    a.scheduledDate.localeCompare(b.scheduledDate) ||
    (a.timeSlot?.to ?? "99").localeCompare(b.timeSlot?.to ?? "99") ||
    (a.timeSlot?.from ?? "99").localeCompare(b.timeSlot?.from ?? "99")
  );
}
