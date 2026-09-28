/**
 * Private events hub helpers: shortlist parsing, size bands and the
 * occasion → legacy event_type mapping the inquiry row depends on.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EVENT_OCCASIONS, SIZE_BANDS, guestsBand, isEventType, occasionToEventType, parseShortlist, sizeBandBySlug, spaceFitsBand, venueFitsBand, withShortlist } from '../src/lib/private-events.ts';

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
