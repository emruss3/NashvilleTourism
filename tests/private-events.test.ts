/**
 * Private events hub helpers: shortlist parsing, size bands and the
 * occasion → legacy event_type mapping the inquiry row depends on.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EVENT_OCCASIONS, SIZE_BANDS, briefHref, formatBriefDate, guestsBand, isEventType, monthToDate, occasionToEventType, parseShortlist, readBriefParams, sizeBandBySlug, spaceFitsBand, venueFitsBand, withShortlist } from '../src/lib/private-events.ts';
import { formatPerPerson, perPersonRange, priceBandForAmount, spacePriceBand } from '../src/lib/events/types.ts';

test('shortlist parsing keeps at most five valid, distinct slugs', () => {
  assert.deepEqual(parseShortlist('jbjs-nashville,playdate-nashville'), ['jbjs-nashville', 'playdate-nashville']);
  assert.deepEqual(parseShortlist('a-b, a-b ,Bad Slug,../x'), ['a-b']);
  assert.deepEqual(parseShortlist(['one-1', 'two-2']), ['one-1', 'two-2']);
  assert.deepEqual(parseShortlist('v1,v2,v3,v4,v5,v6,v7'), ['v1', 'v2', 'v3', 'v4', 'v5']);
  assert.deepEqual(parseShortlist(undefined), []);
});

test('withShortlist appends ?v= before the hash and leaves paths alone when empty', () => {
  assert.equal(withShortlist('/private-events/#inquiry', ['a-b', 'c-d']), '/private-events/?v=a-b%2Cc-d#inquiry');
  assert.equal(withShortlist('/private-events/venues/x-y/', []), '/private-events/venues/x-y/');
});

test('size bands overlap a space by its guest range, and unpublished zero-capacity spaces never fit', () => {
  const band = (slug: string) => sizeBandBySlug(slug)!;
  const room = { seatedCapacity: 40, standingCapacity: 60, minGuests: 20 };
  assert.equal(spaceFitsBand(room, band('up-to-25')), true, 'min 20 sits inside the band');
  assert.equal(spaceFitsBand(room, band('25-75')), true);
  assert.equal(spaceFitsBand(room, band('75-200')), false, 'capacity 60 is under the band floor');
  assert.equal(spaceFitsBand({ seatedCapacity: 0, standingCapacity: 0 }, band('up-to-25')), false);
  assert.equal(spaceFitsBand({ seatedCapacity: 300, standingCapacity: 500, minGuests: 150 }, band('200-plus')), true);
  assert.equal(venueFitsBand({ spaces: [room, { seatedCapacity: 250, standingCapacity: 400 }] }, band('200-plus')), true);
  assert.equal(SIZE_BANDS.length, 4);
});

test('every occasion stores a legal event_type and guest bands share the browse edges', () => {
  for (const o of EVENT_OCCASIONS) assert.ok(isEventType(o.eventType), o.value);
  assert.equal(occasionToEventType('bachelorette'), 'celebration');
  assert.equal(occasionToEventType('corporate'), 'corporate');
  assert.equal(occasionToEventType(undefined), 'other');
  assert.equal(guestsBand(12), 'up-to-25');
  assert.equal(guestsBand(75), '25-75');
  assert.equal(guestsBand(900), '200-plus');
  assert.equal(guestsBand(undefined), undefined);
});

test('the brief page reads its state from the URL and every entry point can build that URL', () => {
  const read = readBriefParams({ occasion: 'bachelorette', guests: '24', date: '2026-12-31', flexible: '1', v: 'jbjs-nashville,playdate-nashville', venue: 'hank-williams-jr-boogie-bar' });
  assert.deepEqual(read.prefill, { type: undefined, occasion: 'bachelorette', guests: 24, date: '2026-12-31', flexible: true });
  assert.deepEqual(read.shortlist, ['jbjs-nashville', 'playdate-nashville']);
  assert.equal(read.venue, 'hank-williams-jr-boogie-bar');
  const bad = readBriefParams({ occasion: 'wedding', guests: '-3', date: '2026-13-40', venue: '../etc' });
  assert.deepEqual(bad.prefill, { type: undefined, occasion: undefined, guests: undefined, date: undefined, flexible: false });
  assert.equal(bad.venue, undefined);
  assert.equal(briefHref(), '/private-events/brief/');
  assert.equal(briefHref({ occasion: 'corporate', guests: 40, date: '2026-12-31', flexible: true, shortlist: ['a-b'], venue: 'c-d' }), '/private-events/brief/?occasion=corporate&guests=40&date=2026-12-31&flexible=1&v=a-b&venue=c-d');
});

test('a month-only answer is stored as the first of the month with flexible dates, and reads back as the month', () => {
  assert.equal(monthToDate('2026-12'), '2026-12-01');
  assert.equal(monthToDate('2026-13'), undefined);
  assert.equal(formatBriefDate('2026-12-01', true), 'December 2026 (any date)');
  assert.equal(formatBriefDate('2026-12-31', true), 'Thu, Dec 31, 2026 (flexible)');
  assert.equal(formatBriefDate('2026-12-31', false), 'Thu, Dec 31, 2026');
  assert.equal(formatBriefDate(undefined, false), 'not set');
});

test('price bands derive from the stored minimum and never expose it', () => {
  assert.equal(priceBandForAmount(0), '$');
  assert.equal(priceBandForAmount(2499), '$');
  assert.equal(priceBandForAmount(2500), '$$');
  assert.equal(priceBandForAmount(9999), '$$$');
  assert.equal(priceBandForAmount(10000), '$$$$');
  assert.equal(priceBandForAmount(25000), '$$$$$');
  assert.deepEqual(spacePriceBand({ pricingModel: 'min_spend', minSpendCents: 750000 }), { band: '$$$', basis: 'minimum spend' });
  assert.deepEqual(spacePriceBand({ pricingModel: 'buyout', buyoutFromCents: 3000000, minSpendCents: 100000 }), { band: '$$$$$', basis: 'buyout' });
  assert.equal(spacePriceBand({ pricingModel: 'per_person' }), undefined, 'per-person only spaces carry no event band');
  assert.deepEqual(perPersonRange({ perPersonCents: 4500, perPersonMaxCents: 8000 }), { min: 45, max: 80 });
  assert.equal(formatPerPerson({ min: 45, max: 80 }), '$45 to $80 a person');
  assert.equal(formatPerPerson({ min: 45 }), 'about $45 a person');
});
