/**
 * The dashboard's plain-language mirror of the publish triggers.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { explainDbError, packageProblems, spaceProblems, venueProblems } from '../src/lib/events/publish-check.ts';

test('a venue needs no TODO, a sales email and desk approval', () => {
  assert.deepEqual(venueProblems({ name: 'Playdate', summary: 'A room.', salesContactEmail: 'sales@example.com', approvedAt: '2026-09-29T00:00:00Z' }), []);
  const problems = venueProblems({ name: 'Playdate', summary: 'TODO: summary', salesContactEmail: 'TODO@example.com', approvedAt: null });
  assert.deepEqual(problems, ['The summary still says TODO', 'The sales contact email still says TODO', 'The events desk has not approved the first publish yet']);
  assert.ok(venueProblems({ name: 'X', salesContactEmail: '', approvedAt: '2026-09-29T00:00:00Z' }).includes('A sales contact email is required; leads are sent there'));
});

test('a space needs both capacities and one price, and no TODO anywhere', () => {
  assert.deepEqual(spaceProblems({ name: 'Rooftop', seatedCapacity: 80, standingCapacity: 150, pricingModel: 'min_spend', minSpendCents: 500000 }), []);
  assert.deepEqual(spaceProblems({ name: 'Rooftop', seatedCapacity: 0, standingCapacity: 0, pricingModel: 'min_spend', pricingNote: 'TODO: pricing' }), [
    'Seated capacity is missing',
    'Standing capacity is missing',
    'A price is missing: minimum spend, room fee, per person or buyout',
    'The pricing note still says TODO',
  ]);
});

test('a package needs a price, a booking link and a maximum group size', () => {
  assert.deepEqual(packageProblems({ name: 'Patio for 20', priceCents: 120000, bookUrl: 'https://venue.example/book', maxGuests: 20 }), []);
  assert.deepEqual(packageProblems({ name: 'Patio for 20', priceCents: 0, bookUrl: '', maxGuests: null, includes: ['TODO menu'] }), [
    'What is included still says TODO',
    'A price is required',
    'A booking link to your own system is required',
    'A maximum group size is required',
  ]);
});

test('database trigger messages read as plain language', () => {
  assert.equal(explainDbError('event_spaces: cannot publish rooftop without seated and standing capacity'), 'Cannot publish rooftop: without seated and standing capacity');
  assert.equal(explainDbError('event_venues: cannot publish playdate-nashville before the events desk approves it'), 'Cannot publish playdate-nashville: before the events desk approves it');
});
