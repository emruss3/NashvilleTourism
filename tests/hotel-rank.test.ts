/**
 * Marketplace ranking and default dates. Runs before `next build`.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { passesFilters, priceBandFromCategory, rankMarketplace, scoreRate } from '../src/lib/feeds/hotel-marketplace-rank.ts';
import type { LiveHotelRate } from '../src/lib/feeds/hotels-live.ts';
import { distanceKm, inDavidsonCounty, LOWER_BROADWAY } from '../src/lib/geo.ts';
import { defaultStayDates, resolveStayDates } from '../src/lib/stay-dates.ts';

function rate(over: Partial<LiveHotelRate> & { hotelId: string }): LiveHotelRate {
  return {
    name: over.hotelId,
    lat: 36.16,
    lng: -86.78,
    facilities: [],
    nightly: { amount: 250, currency: 'USD' },
    total: { amount: 500, currency: 'USD' },
    nights: 2,
    fetchedAt: '2026-09-25T12:00:00Z',
    expiresAt: '2026-09-25T15:00:00Z',
    provider: 'liteapi',
    ...over,
  };
}

test('editorial hotels are pinned first, in editorial order, regardless of score', () => {
  const rates = [
    rate({ hotelId: 'lpA', rating: 9.8, reviewCount: 900, stars: 5 }),
    rate({ hotelId: 'lp65570334', rating: 6, reviewCount: 10, stars: 3, lat: 36.2, lng: -86.7 }),
    rate({ hotelId: 'lp65576337', rating: 7, reviewCount: 50, stars: 4 }),
  ];
  const ranked = rankMarketplace(rates, { center: LOWER_BROADWAY, pinnedIds: ['lp65576337', 'lp65570334'] });
  assert.deepEqual(ranked.map((r) => r.rate.hotelId), ['lp65576337', 'lp65570334', 'lpA']);
  assert.ok(ranked[0].pinned && ranked[1].pinned && !ranked[2].pinned);
});

test('suggested selling price never changes the order', () => {
  const base = [
    rate({ hotelId: 'lp1', rating: 8, reviewCount: 200, stars: 4, nightly: { amount: 200, currency: 'USD' } }),
    rate({ hotelId: 'lp2', rating: 8.5, reviewCount: 300, stars: 4, nightly: { amount: 210, currency: 'USD' } }),
    rate({ hotelId: 'lp3', rating: 7, reviewCount: 100, stars: 3, nightly: { amount: 150, currency: 'USD' } }),
  ];
  const withSsp = base.map((r, i) => ({ ...r, ssp: { amount: [999, 1, 500][i] } }));
  const withoutSsp = base.map((r) => ({ ...r, ssp: undefined }));
  const order = (rows: LiveHotelRate[]) => rankMarketplace(rows, { center: LOWER_BROADWAY }).map((r) => `${r.rate.hotelId}:${r.score}`);
  assert.deepEqual(order(withSsp), order(withoutSsp));
});

test('results outside Davidson County and duplicates are dropped', () => {
  const rates = [rate({ hotelId: 'lpIndiana', lat: 39.2, lng: -86.2 }), rate({ hotelId: 'lpX' }), rate({ hotelId: 'lpX' })];
  const ranked = rankMarketplace(rates);
  assert.deepEqual(ranked.map((r) => r.rate.hotelId), ['lpX']);
  assert.equal(inDavidsonCounty({ lat: 36.211, lng: -86.693 }), true, 'Music Valley is inside');
  assert.equal(inDavidsonCounty({ lat: 35.92, lng: -86.87 }), false, 'Franklin is outside');
});

test('filters: stars, price ceiling, refundable, type, facilities, chain size, occupancy', () => {
  const r = rate({ hotelId: 'lp1', stars: 3, nightly: { amount: 300, currency: 'USD' }, refundable: 'NRFN', hotelTypeName: 'Apartment', facilities: ['Outdoor swimming pool', 'Gym'], chainSize: 12, maxOccupancy: 4 });
  assert.equal(passesFilters(r, {}), true);
  assert.equal(passesFilters(r, { minStars: 4 }), false);
  assert.equal(passesFilters(r, { maxNightly: 250 }), false);
  assert.equal(passesFilters(r, { refundableOnly: true }), false);
  assert.equal(passesFilters(r, { type: 'rental' }), true);
  assert.equal(passesFilters(r, { type: 'hotel' }), false);
  assert.equal(passesFilters(r, { facilities: ['pool'] }), true);
  assert.equal(passesFilters(r, { facilities: ['spa'] }), false);
  assert.equal(passesFilters(r, { maxChainSize: 3 }), false);
  assert.equal(passesFilters(r, { minOccupancy: 6 }), false);
  assert.equal(passesFilters(rate({ hotelId: 'lp2', hotelTypeName: 'Hotel' }), { type: 'hotel' }), true);
  assert.equal(passesFilters(rate({ hotelId: 'lp3', name: 'Broadway Lofts Apartments' }), { type: 'rental' }), true, 'name fallback when the type lookup is empty');
});

test('distance, rating volume and price fit move the score in the expected direction', () => {
  const near = scoreRate(rate({ hotelId: 'a', lat: 36.1612, lng: -86.7775 }), { center: LOWER_BROADWAY }).score;
  const far = scoreRate(rate({ hotelId: 'b', lat: 36.21, lng: -86.69 }), { center: LOWER_BROADWAY }).score;
  assert.ok(near > far, 'closer scores higher');
  const many = scoreRate(rate({ hotelId: 'c', rating: 8, reviewCount: 800 })).score;
  const few = scoreRate(rate({ hotelId: 'd', rating: 8, reviewCount: 3 })).score;
  assert.ok(many > few, 'review volume counts');
  const fit = scoreRate(rate({ hotelId: 'e', nightly: { amount: 250, currency: 'USD' } }), { priceBand: [200, 380] }).score;
  const miss = scoreRate(rate({ hotelId: 'f', nightly: { amount: 900, currency: 'USD' } }), { priceBand: [200, 380] }).score;
  assert.ok(fit > miss, 'price inside the band scores higher');
  assert.deepEqual(priceBandFromCategory('$$$–$$$$'), [200, 900]);
  assert.deepEqual(priceBandFromCategory('$$'), [120, 220]);
  assert.equal(priceBandFromCategory('unknown'), undefined);
  assert.ok(Math.abs(distanceKm(LOWER_BROADWAY, { lat: 36.211, lng: -86.693 }) - 9.4) < 1, 'Broadway to Opryland is about 9 km');
});

test('sort by distance and limit are honoured after pinning', () => {
  const rates = [rate({ hotelId: 'lpFar', lat: 36.19, lng: -86.75 }), rate({ hotelId: 'lpNear', lat: 36.162, lng: -86.778 }), rate({ hotelId: 'lpPin', lat: 36.2, lng: -86.7 })];
  const ranked = rankMarketplace(rates, { center: LOWER_BROADWAY, sort: 'distance', pinnedIds: ['lpPin'], limit: 2 });
  assert.deepEqual(ranked.map((r) => r.rate.hotelId), ['lpPin', 'lpNear']);
});

test('default dates are the coming Friday to Sunday in Nashville time', () => {
  // Wednesday 2026-09-23 18:00 Chicago = 23:00Z
  const wed = defaultStayDates(new Date('2026-09-23T23:00:00Z'));
  assert.deepEqual([wed.checkin, wed.checkout, wed.chosen], ['2026-09-25', '2026-09-27', false]);
  // Friday 2026-09-25 22:30 Chicago is still Friday locally but Saturday in UTC; a Friday rolls a week out.
  const fri = defaultStayDates(new Date('2026-09-26T03:30:00Z'));
  assert.deepEqual([fri.checkin, fri.checkout], ['2026-10-02', '2026-10-04']);
  const chosen = resolveStayDates('2026-11-06', '2026-11-08');
  assert.deepEqual([chosen.checkin, chosen.checkout, chosen.chosen], ['2026-11-06', '2026-11-08', true]);
  assert.equal(resolveStayDates('2026-11-08', '2026-11-06', new Date('2026-09-23T23:00:00Z')).checkin, '2026-09-25', 'reversed dates fall back');
});
