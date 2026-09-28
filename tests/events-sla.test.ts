/**
 * Business-hour SLA arithmetic in Nashville time.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addBusinessHours, businessHoursBetween, localToDate, nextBusinessMoment } from '../src/lib/events/sla.ts';

// Helper: Nashville local time to an instant. 2026-09-28 is a Monday.
const nash = (y: number, m: number, d: number, h: number, min = 0) => localToDate(y, m, d, h, min);

test('localToDate handles central daylight and standard time', () => {
  assert.equal(nash(2026, 7, 1, 12).toISOString(), '2026-07-01T17:00:00.000Z', 'CDT is UTC-5');
  assert.equal(nash(2026, 1, 15, 12).toISOString(), '2026-01-15T18:00:00.000Z', 'CST is UTC-6');
});

test('next business moment skips evenings and weekends', () => {
  assert.equal(nextBusinessMoment(nash(2026, 9, 28, 10)).getTime(), nash(2026, 9, 28, 10).getTime(), 'Monday 10:00 stays');
  assert.equal(nextBusinessMoment(nash(2026, 9, 28, 7)).getTime(), nash(2026, 9, 28, 9).getTime(), 'Monday 07:00 moves to 09:00');
  assert.equal(nextBusinessMoment(nash(2026, 9, 28, 19)).getTime(), nash(2026, 9, 29, 9).getTime(), 'Monday 19:00 moves to Tuesday 09:00');
  assert.equal(nextBusinessMoment(nash(2026, 10, 3, 12)).getTime(), nash(2026, 10, 5, 9).getTime(), 'Saturday noon moves to Monday 09:00');
});

test('24 business hours is a little under three business days', () => {
  // Monday 10:00 + 24h: Mon 8h left, Tue 9h, Wed 7h -> Wed 16:00
  assert.equal(addBusinessHours(nash(2026, 9, 28, 10), 24).getTime(), nash(2026, 9, 30, 16).getTime());
  // Friday 15:00 + 24h: Fri 3h, Mon 9h, Tue 9h, Wed 3h -> Wed 12:00
  assert.equal(addBusinessHours(nash(2026, 10, 2, 15), 24).getTime(), nash(2026, 10, 7, 12).getTime());
  // Saturday routing starts the clock Monday 09:00
  assert.equal(addBusinessHours(nash(2026, 10, 3, 11), 9).getTime(), nash(2026, 10, 5, 18).getTime());
});

test('business hours between two instants ignores nights and weekends', () => {
  assert.equal(businessHoursBetween(nash(2026, 10, 2, 15), nash(2026, 10, 5, 12)), 6, 'Fri 15:00 to Mon 12:00 is 3 + 3');
  assert.equal(businessHoursBetween(nash(2026, 9, 28, 10), nash(2026, 9, 28, 9)), 0, 'never negative');
});
