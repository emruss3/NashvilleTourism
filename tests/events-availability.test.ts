/**
 * Availability helpers: month windows, day overrides, and the rule that a
 * venue greys out only when every listed space is booked. Runs before
 * `next build`.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addMonths, bookedDays, bookedMonths, nextMonths, spaceDayStatus, spaceMonthStatus, venueBooked } from '../src/lib/events/availability.ts';
import type { SpaceAvailability } from '../src/lib/events/types.ts';

const spaces = [{ id: 'roof' }, { id: 'pdr' }];
const rows: SpaceAvailability[] = [
  { spaceId: 'roof', venueId: 'v', month: '2026-12', status: 'booked' },
  { spaceId: 'pdr', venueId: 'v', month: '2026-12', status: 'booked' },
  { spaceId: 'roof', venueId: 'v', month: '2026-11', status: 'limited' },
  { spaceId: 'roof', venueId: 'v', day: '2026-11-14', status: 'booked' },
  { spaceId: 'pdr', venueId: 'v', day: '2026-11-14', status: 'booked' },
];

test('month windows roll over the year end', () => {
  assert.deepEqual(nextMonths(3, '2026-11'), ['2026-11', '2026-12', '2027-01']);
  assert.equal(addMonths('2026-01', -1), '2025-12');
});

test('no row means ask; a day override beats its month', () => {
  assert.equal(spaceMonthStatus(rows, 'pdr', '2026-11'), 'ask');
  assert.equal(spaceMonthStatus(rows, 'roof', '2026-11'), 'limited');
  assert.equal(spaceDayStatus(rows, 'roof', '2026-11-14'), 'booked');
  assert.equal(spaceDayStatus(rows, 'roof', '2026-11-20'), 'limited');
});

test('a venue is booked only when every listed space is booked', () => {
  assert.equal(venueBooked(rows, spaces, '2026-12'), true);
  assert.equal(venueBooked(rows, spaces, '2026-11'), false, 'the pdr said nothing for November');
  assert.equal(venueBooked(rows, spaces, '2026-11-14'), true, 'both spaces booked that day');
  assert.equal(venueBooked(rows, [], '2026-12'), false);
  assert.deepEqual(bookedMonths(rows, spaces, ['2026-10', '2026-11', '2026-12']), ['2026-12']);
  assert.deepEqual(bookedDays(rows, spaces), ['2026-11-14']);
});
