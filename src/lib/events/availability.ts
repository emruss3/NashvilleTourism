import type { AvailabilityStatus, EventSpace, SpaceAvailability } from './types.ts';

/**
 * Month- and day-level availability a venue states for each space. Pure
 * helpers shared by the venue page strip, the brief's grey-out and the
 * editor; the rows come from `listAvailability` in venues.ts.
 *
 * A day override wins over its month. No row means "ask": we never imply a
 * space is free because nobody said otherwise.
 */

export type AvailabilityView = AvailabilityStatus | 'ask';

export const AVAILABILITY_LABEL: Record<AvailabilityView, string> = {
  open: 'Open',
  limited: 'Limited',
  booked: 'Booked',
  ask: 'Ask',
};

/** "2026-10" for a date in Nashville time. */
export function monthKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit' }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}`;
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** ["2026-10", "2026-11", "2026-12"] from a start month. */
export function nextMonths(count: number, from = monthKey()): string[] {
  return Array.from({ length: count }, (_, i) => addMonths(from, i));
}

export function monthLabel(month: string, style: 'short' | 'long' = 'short'): string {
  const [y, m] = month.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { month: style, year: style === 'long' ? 'numeric' : undefined, timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, 1)));
}

/** The status of one space for a month: the month row, or "ask" when none. */
export function spaceMonthStatus(rows: SpaceAvailability[], spaceId: string, month: string): AvailabilityView {
  return rows.find((r) => r.spaceId === spaceId && r.month === month)?.status ?? 'ask';
}

/** The status of one space for a day: the day override, else its month. */
export function spaceDayStatus(rows: SpaceAvailability[], spaceId: string, day: string): AvailabilityView {
  const override = rows.find((r) => r.spaceId === spaceId && r.day === day);
  if (override) return override.status;
  return spaceMonthStatus(rows, spaceId, day.slice(0, 7));
}

/**
 * True when the venue has said every one of its listed spaces is booked for
 * the date (YYYY-MM-DD) or the month (YYYY-MM). Spaces with no statement
 * count as not booked, so silence never greys a venue out.
 */
export function venueBooked(rows: SpaceAvailability[], spaces: Pick<EventSpace, 'id'>[], when: string): boolean {
  if (!spaces.length) return false;
  const status = (id: string) => (when.length === 7 ? spaceMonthStatus(rows, id, when) : spaceDayStatus(rows, id, when));
  return spaces.every((s) => status(s.id) === 'booked');
}

/** Months in the window where the whole venue is booked, for the brief's grey-out. */
export function bookedMonths(rows: SpaceAvailability[], spaces: Pick<EventSpace, 'id'>[], months: string[]): string[] {
  return months.filter((m) => venueBooked(rows, spaces, m));
}

/** Days in the window with an override that books the whole venue. */
export function bookedDays(rows: SpaceAvailability[], spaces: Pick<EventSpace, 'id'>[]): string[] {
  const days = [...new Set(rows.filter((r) => r.day).map((r) => r.day as string))];
  return days.filter((d) => venueBooked(rows, spaces, d)).sort();
}
