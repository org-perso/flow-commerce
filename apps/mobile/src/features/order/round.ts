import type { Order } from './order-api';
import { isOverdue } from './order-row';
import { byPlannedTime, type TimeSlot } from './time-slot';

/** Moments of the day, in round order; a slot belongs to the one it ends in. */
const MOMENTS = [
  { label: 'Ce matin', until: '12:00' },
  { label: 'Midi', until: '14:00' },
  { label: 'Cet après-midi', until: '18:00' },
  { label: 'Ce soir', until: '24:00' },
] as const;
const NO_SLOT = 'Sans créneau';

export function momentOf(slot: TimeSlot | null): string {
  if (slot?.to) return MOMENTS.find((m) => slot.to! <= m.until)!.label;
  if (slot?.from) return MOMENTS.find((m) => slot.from! < m.until)!.label;
  return NO_SLOT;
}

/** "Analakely", " analakély " and "ANALAKELY" are the same place. */
export function placeKey(order: Order): string {
  return (order.delivery?.place ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const placeLabel = (order: Order) => order.delivery?.place?.trim() || 'Lieu non précisé';

/** Same place together (no place last), then by slot. */
const byPlaceThenTime = (a: Order, b: Order) =>
  (placeKey(a) || '￿').localeCompare(placeKey(b) || '￿') || byPlannedTime(a, b);

export type RoundSection = { title: string; data: Order[]; tone?: 'danger'; numbered?: boolean };

/**
 * Today's round of a driver (overdue and today's open deliveries).
 * - Organised by the driver: "Ma tournée" in their order, new ones under "À placer".
 * - Otherwise automatic: overdue first, then by moment of the day, then by place.
 */
export function roundSections(current: Order[], today: string): RoundSection[] {
  const placed = current
    .filter((o) => o.routePosition != null)
    .sort((a, b) => a.routePosition! - b.routePosition!);
  if (placed.length > 0) {
    const rest = current.filter((o) => o.routePosition == null).sort(byPlannedTime);
    return [
      { title: 'Ma tournée', data: placed, numbered: true },
      ...(rest.length ? [{ title: 'À placer', data: rest }] : []),
    ];
  }

  const sections: RoundSection[] = [];
  const overdue = current.filter((o) => isOverdue(o, today)).sort(byPlaceThenTime);
  if (overdue.length) sections.push({ title: 'En retard', data: overdue, tone: 'danger' });

  const byGroup = new Map<string, RoundSection>();
  const onTime = current.filter((o) => !isOverdue(o, today));
  const moments = [...MOMENTS.map((m) => m.label), NO_SLOT];
  onTime
    .sort(
      (a, b) =>
        moments.indexOf(momentOf(a.timeSlot)) - moments.indexOf(momentOf(b.timeSlot)) ||
        byPlaceThenTime(a, b),
    )
    .forEach((order) => {
      const key = `${momentOf(order.timeSlot)}|${placeKey(order)}`;
      const section = byGroup.get(key) ?? {
        title: `${momentOf(order.timeSlot)} · ${placeLabel(order)}`,
        data: [],
      };
      section.data.push(order);
      byGroup.set(key, section);
    });
  return [...sections, ...byGroup.values()];
}

/** The round as one list: what the driver starts from when organising it. */
export const roundOrder = (current: Order[], today: string): Order[] =>
  roundSections(current, today).flatMap((s) => s.data);
