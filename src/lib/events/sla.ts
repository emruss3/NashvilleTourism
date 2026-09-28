/**
 * Business-hour arithmetic for the reply SLA, in Nashville time.
 *
 * Business hours are Monday to Friday, 09:00 to 18:00 America/Chicago (nine
 * hours a day). "24 business hours" from a Friday 15:00 routing therefore
 * lands on Wednesday 12:00, not Saturday. Pure functions, no dependencies,
 * unit-tested in tests/events-sla.test.ts.
 */

export const BUSINESS_DAY_START_HOUR = 9;
export const BUSINESS_DAY_END_HOUR = 18;
export const TIME_ZONE = 'America/Chicago';

interface LocalParts {
  y: number;
  m: number;
  d: number;
  hour: number;
  minute: number;
  weekday: number;
}

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  weekday: 'short',
});

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function localParts(at: Date): LocalParts {
  const parts = partsFormatter.formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return {
    y: Number(get('year')),
    m: Number(get('month')),
    d: Number(get('day')),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    weekday: WEEKDAYS.indexOf(get('weekday')),
  };
}

/** The instant that is `y-m-d hour:minute` in Nashville, found by correcting the UTC guess for the zone offset. */
export function localToDate(y: number, m: number, d: number, hour: number, minute = 0): Date {
  let guess = new Date(Date.UTC(y, m - 1, d, hour, minute));
  for (let i = 0; i < 3; i += 1) {
    const p = localParts(guess);
    const diffMinutes = (Date.UTC(y, m - 1, d, hour, minute) - Date.UTC(p.y, p.m - 1, p.d, p.hour, p.minute)) / 60_000;
    if (diffMinutes === 0) break;
    guess = new Date(guess.getTime() + diffMinutes * 60_000);
  }
  return guess;
}

function isBusinessDay(weekday: number): boolean {
  return weekday >= 1 && weekday <= 5;
}

/** Move `at` forward to the next moment inside business hours (unchanged if already inside). */
export function nextBusinessMoment(at: Date): Date {
  let cursor = at;
  for (let i = 0; i < 10; i += 1) {
    const p = localParts(cursor);
    if (isBusinessDay(p.weekday) && p.hour >= BUSINESS_DAY_START_HOUR && p.hour < BUSINESS_DAY_END_HOUR) return cursor;
    if (isBusinessDay(p.weekday) && p.hour < BUSINESS_DAY_START_HOUR) return localToDate(p.y, p.m, p.d, BUSINESS_DAY_START_HOUR);
    // After hours or a weekend: 09:00 on the next calendar day, then re-check.
    cursor = localToDate(p.y, p.m, p.d + 1, BUSINESS_DAY_START_HOUR);
  }
  return cursor;
}

/** `hours` business hours after `from`, in Nashville time. */
export function addBusinessHours(from: Date, hours: number): Date {
  let remainingMinutes = Math.max(0, Math.round(hours * 60));
  let cursor = nextBusinessMoment(from);
  for (let i = 0; i < 400 && remainingMinutes > 0; i += 1) {
    const p = localParts(cursor);
    const endOfDay = localToDate(p.y, p.m, p.d, BUSINESS_DAY_END_HOUR);
    const minutesLeftToday = Math.max(0, Math.round((endOfDay.getTime() - cursor.getTime()) / 60_000));
    if (remainingMinutes <= minutesLeftToday) {
      return new Date(cursor.getTime() + remainingMinutes * 60_000);
    }
    remainingMinutes -= minutesLeftToday;
    cursor = nextBusinessMoment(new Date(endOfDay.getTime() + 60_000));
  }
  return cursor;
}

/** Business hours elapsed between two instants (fractional). */
export function businessHoursBetween(from: Date, to: Date): number {
  if (to <= from) return 0;
  let minutes = 0;
  let cursor = nextBusinessMoment(from);
  for (let i = 0; i < 400 && cursor < to; i += 1) {
    const p = localParts(cursor);
    const endOfDay = localToDate(p.y, p.m, p.d, BUSINESS_DAY_END_HOUR);
    const stop = endOfDay < to ? endOfDay : to;
    minutes += Math.max(0, (stop.getTime() - cursor.getTime()) / 60_000);
    cursor = nextBusinessMoment(new Date(endOfDay.getTime() + 60_000));
  }
  return Math.round((minutes / 60) * 100) / 100;
}

/** "Wed, Oct 1 at 12:00 pm" in Nashville time, for emails. */
export function formatNashville(at: Date): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(at);
}
