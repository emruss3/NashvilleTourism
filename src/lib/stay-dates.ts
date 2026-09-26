/**
 * Default stay dates for marketplace surfaces that have no dates in the URL:
 * the next Friday to Sunday in Nashville time (America/Chicago). "Next" means
 * the coming Friday; on a Friday it means a week out, so a same-day search
 * never quotes tonight as if it were a planned weekend.
 */

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function chicagoToday(now: Date): { y: number; m: number; d: number; weekday: number } {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return { y: Number(get('year')), m: Number(get('month')), d: Number(get('day')), weekday: weekdays.indexOf(get('weekday')) };
}

function addDays(y: number, m: number, d: number, days: number): string {
  const t = Date.UTC(y, m - 1, d + days);
  return new Date(t).toISOString().slice(0, 10);
}

/** Today's date in Nashville, for `min` on date fields. Safe on the server and in the browser. */
export function todayChicagoISO(now = new Date()): string {
  const t = chicagoToday(now);
  return addDays(t.y, t.m, t.d, 0);
}

export interface StayDates {
  checkin: string;
  checkout: string;
  /** True when the dates were supplied by the visitor rather than defaulted. */
  chosen: boolean;
}

export function defaultStayDates(now = new Date()): StayDates {
  const today = chicagoToday(now);
  const daysToFriday = ((5 - today.weekday + 7) % 7) || 7;
  return { checkin: addDays(today.y, today.m, today.d, daysToFriday), checkout: addDays(today.y, today.m, today.d, daysToFriday + 2), chosen: false };
}

/** Visitor dates when both are valid and in order; otherwise the default weekend. */
export function resolveStayDates(checkin?: string, checkout?: string, now = new Date()): StayDates {
  if (checkin && checkout && ISO_DAY.test(checkin) && ISO_DAY.test(checkout) && checkout > checkin) {
    return { checkin, checkout, chosen: true };
  }
  return defaultStayDates(now);
}

export function nightsBetween(checkin: string, checkout: string): number {
  return Math.max(1, Math.round((Date.parse(`${checkout}T00:00:00Z`) - Date.parse(`${checkin}T00:00:00Z`)) / 86_400_000));
}

/** "Fri 9 Oct to Sun 11 Oct" */
export function stayDatesLabel(dates: { checkin: string; checkout: string }): string {
  const fmt = (iso: string) => new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));
  return `${fmt(dates.checkin)} to ${fmt(dates.checkout)}`;
}
