/**
 * The event finder: the recommendation changes with every input, never
 * invents a space, caps priorities at three, and ignores ownership.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ANY_AREA, FINDER_EVENT_TYPES, MAX_PRIORITIES, PRIORITIES, chooseLayout, finderParams, matchSpaces, maxGuestsFor, parsePriorities, prioritiesToNeeds, readFinderParams, recommend, sizesFor, type FinderVenue } from '../src/lib/events/finder.ts';
import type { EventSpace } from '../src/lib/events/types.ts';
import { isOccasion } from '../src/lib/private-events.ts';

function space(over: Partial<EventSpace> & { slug: string; name: string }): EventSpace {
  return {
    id: over.slug,
    venueId: 'v',
    summary: '',
    seatedCapacity: 0,
    standingCapacity: 0,
    pricingModel: 'min_spend',
    minSpendCents: 500000,
    avIncluded: false,
    outdoor: false,
    accessible: true,
    privateEntrance: false,
    sortOrder: 0,
    published: true,
    ...over,
  };
}

const jbjs: FinderVenue = {
  slug: 'jbjs-nashville',
  name: "JBJ's Nashville",
  kind: 'music_venue',
  neighborhoodSlug: 'downtown-broadway',
  ownedByBph: true,
  verified: false,
  features: ['stage', 'house_sound', 'full_bar', 'rooftop'],
  spaces: [
    space({ slug: 'full-venue-buyout', name: 'Full venue buyout', seatedCapacity: 500, standingCapacity: 1700, minGuests: 300, pricingModel: 'buyout', buyoutFromCents: 8250000, avIncluded: true, outdoor: true, privateEntrance: true }),
    space({ slug: 'rooftop-exclusive', name: '5th Floor Rooftop (exclusive)', seatedCapacity: 120, standingCapacity: 400, minGuests: 75, minSpendCents: 1900000, avIncluded: true, outdoor: true }),
    space({ slug: 'rooftop-semi-private', name: '5th Floor Rooftop (semi-private)', seatedCapacity: 60, standingCapacity: 150, minGuests: 25, minSpendCents: 1150000, outdoor: true }),
    space({ slug: '4th-ave-roof-deck', name: '4th Ave Roof Deck', seatedCapacity: 30, standingCapacity: 60, minGuests: 10, minSpendCents: 175000, outdoor: true }),
    space({ slug: '4th-floor-exclusive', name: '4th Floor (exclusive)', seatedCapacity: 160, standingCapacity: 410, minGuests: 60, minSpendCents: 1350000, avIncluded: true }),
    space({ slug: '3rd-floor-semi-private', name: '3rd Floor (semi-private)', seatedCapacity: 30, standingCapacity: 55, minGuests: 15, minSpendCents: 300000 }),
    space({ slug: 'main-stage-floor', name: '1st Floor / Main Stage', seatedCapacity: 100, standingCapacity: 500, minGuests: 100, minSpendCents: 1350000, avIncluded: true, privateEntrance: true }),
    space({ slug: 'unpublished-room', name: 'Unpublished room', seatedCapacity: 40, standingCapacity: 80, published: false }),
  ],
};

const gulchDining: FinderVenue = {
  slug: 'gulch-dining',
  name: 'Gulch Dining Room',
  kind: 'restaurant',
  neighborhoodSlug: 'the-gulch',
  ownedByBph: false,
  verified: true,
  features: ['in_house_catering', 'full_bar', 'parking'],
  spaces: [space({ slug: 'private-dining', name: 'Private dining room', seatedCapacity: 40, standingCapacity: 60, minGuests: 12, pricingModel: 'per_person', minSpendCents: undefined, perPersonCents: 9500, privateEntrance: true, avIncluded: true })],
};

test('event types map to legal occasions and promoted types lead', () => {
  for (const t of FINDER_EVENT_TYPES) assert.ok(isOccasion(t.occasion), t.value);
  assert.deepEqual(FINDER_EVENT_TYPES.filter((t) => t.promoted).map((t) => t.value), ['corporate', 'holiday', 'convention', 'offsite', 'celebration']);
  assert.equal(FINDER_EVENT_TYPES.find((t) => t.value === 'offsite')?.occasion, 'corporate');
  assert.equal(PRIORITIES.length, 6);
});

test('the event type drives the group sizes on offer', () => {
  assert.deepEqual(sizesFor('bachelorette').map((b) => b.slug), ['up-to-25', '25-75']);
  assert.deepEqual(sizesFor('convention').map((b) => b.slug), ['25-75', '75-200', '200-plus']);
  assert.equal(sizesFor(undefined).length, 4, 'every band before a type is chosen');
  assert.equal(sizesFor('corporate').length, 4);
  assert.equal(maxGuestsFor('bachelorette'), 75);
  assert.equal(maxGuestsFor('corporate'), undefined, 'open-ended');
  for (const t of FINDER_EVENT_TYPES) assert.ok(t.sizes.length >= 2, t.value);
  assert.equal(readFinderParams({ event: 'bachelorette', size: '200-plus' }).size, undefined, 'a size the type is not offered at is dropped');
  assert.equal(readFinderParams({ event: 'bachelorette', size: '25-75' }).size, '25-75');
});

test('priorities are capped at three and map to the brief needs', () => {
  assert.equal(MAX_PRIORITIES, 3);
  assert.deepEqual(parsePriorities('food,music,talk,skyline,av'), ['food', 'music', 'talk']);
  assert.deepEqual(parsePriorities('music,music,bogus,av'), ['music', 'av']);
  assert.deepEqual(prioritiesToNeeds(['skyline', 'av', 'talk']), ['outdoor', 'av']);
});

test('finder state round-trips through the URL and drops unknown values', () => {
  const sp = finderParams({ eventType: 'convention', size: '75-200', area: 'the-gulch', priorities: ['food', 'logistics'] });
  assert.equal(sp.toString(), 'event=convention&size=75-200&area=the-gulch&pri=food%2Clogistics');
  const read = readFinderParams({ event: 'convention', size: '75-200', area: 'the-gulch', pri: 'food,logistics' });
  assert.deepEqual(read, { eventType: 'convention', size: '75-200', area: 'the-gulch', priorities: ['food', 'logistics'] });
  const bad = readFinderParams({ event: 'wedding', size: 'huge', area: 'paris', pri: 'x' });
  assert.deepEqual(bad, { eventType: undefined, size: undefined, area: undefined, priorities: [] });
  assert.equal(readFinderParams({ area: ANY_AREA }).area, ANY_AREA);
});

test('the layout follows the event type, the priorities and the size', () => {
  assert.equal(chooseLayout({ eventType: 'offsite', priorities: [] }), 'seated');
  assert.equal(chooseLayout({ eventType: 'convention', priorities: [] }), 'standing');
  assert.equal(chooseLayout({ eventType: 'corporate', priorities: ['talk', 'food'] }), 'seated');
  assert.equal(chooseLayout({ eventType: 'corporate', priorities: ['music', 'skyline'] }), 'standing');
  assert.equal(chooseLayout({ eventType: 'corporate', size: '75-200', priorities: [] }), 'mixed', 'one point each way');
  assert.equal(chooseLayout({ eventType: 'corporate', size: '200-plus', priorities: ['talk'] }), 'seated', 'talk outweighs the size nudge');
  assert.equal(chooseLayout({ eventType: 'celebration', priorities: [] }), 'mixed');
});

test('the recommendation changes with every input', () => {
  const base = recommend({ eventType: 'corporate', size: '25-75', area: ANY_AREA, priorities: ['talk'] }, [jbjs, gulchDining]);
  const type = recommend({ eventType: 'convention', size: '25-75', area: ANY_AREA, priorities: ['talk'] }, [jbjs, gulchDining]);
  const size = recommend({ eventType: 'corporate', size: '200-plus', area: ANY_AREA, priorities: ['talk'] }, [jbjs, gulchDining]);
  const area = recommend({ eventType: 'corporate', size: '25-75', area: 'germantown', priorities: ['talk'] }, [jbjs, gulchDining]);
  const pri = recommend({ eventType: 'corporate', size: '25-75', area: ANY_AREA, priorities: ['music', 'skyline'] }, [jbjs, gulchDining]);
  assert.notEqual(base.format.title, type.format.title);
  assert.notEqual(base.format.title, pri.format.title);
  assert.notEqual(base.why.join('|'), size.why.join('|'));
  assert.notEqual(base.area.slug, area.area.slug);
  assert.equal(area.area.chosen, true);
  assert.equal(base.area.chosen, false);
  assert.ok(pri.considerations.some((c) => /Weather backup/.test(c)), 'skyline brings a weather note');
  assert.ok(base.considerations.some((c) => /Conversation/.test(c)), 'talk brings a conversation note');
  assert.ok(size.considerations.some((c) => /buyout/.test(c)), '200+ brings the buyout note');
  assert.deepEqual(pri.needs, ['music', 'outdoor']);
});

test('named spaces come only from the rows, fit the size on the layout the brief needs, and are ordered by fit', () => {
  const seated = recommend({ eventType: 'corporate', size: '25-75', area: ANY_AREA, priorities: ['talk', 'food'] }, [jbjs, gulchDining]);
  assert.ok(seated.spaces.length > 0);
  for (const m of seated.spaces) {
    assert.ok(m.space.seatedCapacity >= 25, `${m.space.name} seats ${m.space.seatedCapacity}`);
    assert.ok(m.space.published);
    assert.notEqual(m.space.slug, 'unpublished-room');
  }
  assert.equal(seated.spaces[0].venueSlug, 'gulch-dining', 'the private dining room meets talk and food and is sized to the group');

  const standing = recommend({ eventType: 'convention', size: '200-plus', area: ANY_AREA, priorities: ['music'] }, [jbjs, gulchDining]);
  assert.ok(standing.spaces.length > 0);
  for (const m of standing.spaces) assert.ok(m.space.standingCapacity >= 200, m.space.name);
  assert.ok(standing.spaces.every((m) => m.venueSlug === 'jbjs-nashville'), 'the dining room cannot hold 200');
  assert.ok(standing.spaces.every((m) => m.meets.includes('music')));

  const none = recommend({ eventType: 'offsite', size: '200-plus', area: 'the-gulch', priorities: ['talk'] }, [gulchDining]);
  assert.deepEqual(none.spaces, [], 'no invented space when nothing fits');
  assert.equal(none.area.listed, true);
});

test('a chosen area ranks its own venues first but still shows a better fit elsewhere, labeled', () => {
  const rec = recommend({ eventType: 'corporate', size: '25-75', area: 'the-gulch', priorities: ['skyline'] }, [jbjs, gulchDining]);
  const out = rec.spaces.find((m) => !m.inArea);
  assert.ok(out, 'rooftops downtown appear even though the Gulch was chosen');
  assert.ok(rec.spaces.some((m) => m.inArea));
});

test('ownership never changes the order', () => {
  const input = { eventType: 'holiday' as const, size: '75-200', area: ANY_AREA, priorities: ['music' as const, 'av' as const] };
  const flipped: FinderVenue[] = [{ ...jbjs, ownedByBph: false }, { ...gulchDining, ownedByBph: true }];
  const a = matchSpaces(input, [jbjs, gulchDining], chooseLayout(input)).map((m) => m.space.slug);
  const b = matchSpaces(input, flipped, chooseLayout(input)).map((m) => m.space.slug);
  assert.deepEqual(a, b);
});
