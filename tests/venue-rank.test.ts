/**
 * Venue ranking for the private events marketplace. The compliance control:
 * ownership, fee and sponsorship never change the order.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { EventSpace, EventVenue } from '../src/lib/events/types.ts';
import { capacityFit, rankVenues, suggestVenues } from '../src/lib/events/venue-rank.ts';

let n = 0;
function space(over: Partial<EventSpace> = {}): EventSpace {
  n += 1;
  return { id: `s${n}`, venueId: 'v', slug: `space-${n}`, name: `Space ${n}`, seatedCapacity: 60, standingCapacity: 100, pricingModel: 'min_spend', minSpendCents: 800_000, avIncluded: false, outdoor: false, accessible: true, privateEntrance: false, sortOrder: 0, published: true, ...over };
}
function venue(slug: string, over: Partial<EventVenue> = {}, spaces: EventSpace[] = [space()]): EventVenue {
  return { id: `id-${slug}`, slug, name: slug, kind: 'restaurant', neighborhoodSlug: 'the-gulch', address: 'x', summary: 'x', ownedByBph: false, leadSystem: 'email', feePct: 5, slaHours: 24, published: true, editorialPriority: 0, spaces: spaces.map((s) => ({ ...s, venueId: `id-${slug}` })), ...over };
}

const pool = [
  venue('gulch-room', { neighborhoodSlug: 'the-gulch' }, [space({ seatedCapacity: 50, standingCapacity: 80, minSpendCents: 600_000 })]),
  venue('broadway-rooftop', { neighborhoodSlug: 'downtown-broadway', kind: 'rooftop' }, [space({ seatedCapacity: 120, standingCapacity: 250, minSpendCents: 2_000_000, outdoor: true })]),
  venue('east-bar', { neighborhoodSlug: 'east-nashville', kind: 'bar' }, [space({ seatedCapacity: 30, standingCapacity: 60, minSpendCents: 300_000 })]),
  venue('midtown-hall', { neighborhoodSlug: 'midtown', kind: 'event_space' }, [space({ seatedCapacity: 200, standingCapacity: 400, roomFeeCents: 1_200_000, minSpendCents: undefined, avIncluded: true })]),
];

test('capacity fit rewards rooms sized to the party and never returns zero', () => {
  const s = space({ seatedCapacity: 60, standingCapacity: 100, minGuests: 20 });
  assert.equal(capacityFit(s, 80), 1);
  assert.ok(capacityFit(s, 30) < 1 && capacityFit(s, 30) > 0.6, 'a half-empty room scores lower');
  assert.equal(capacityFit(s, 150), 0.15, 'too many guests is a miss, not an exclusion');
  assert.equal(capacityFit(s, 10), 0.15, 'below the minimum is a miss');
  assert.equal(capacityFit(s), 1, 'no guest count means no capacity opinion');
});

test('a 60-person Gulch reception ranks the Gulch room first and the over-budget rooftop last', () => {
  const order = rankVenues(pool, { guests: 60, budgetRange: '5k-15k', neighborhoods: ['the-gulch'] }).map((r) => r.venue.slug);
  assert.equal(rankVenues(pool, { guests: 60, budgetRange: '$$$', neighborhoods: ['the-gulch'] }).map((r) => r.venue.slug).at(-1), 'broadway-rooftop', 'the $$$ band treats a $20k rooftop as over budget too');
  assert.equal(order[0], 'gulch-room');
  assert.equal(order[order.length - 1], 'broadway-rooftop', 'a $20k minimum against a $15k ceiling sinks it below the oversized but affordable hall');
});

test('needs move the order: outdoor and AV', () => {
  const outdoor = rankVenues(pool, { guests: 150, needs: ['outdoor'] }).map((r) => r.venue.slug);
  assert.equal(outdoor[0], 'broadway-rooftop');
  const av = rankVenues(pool, { guests: 150, needs: ['av'] }).map((r) => r.venue.slug);
  assert.equal(av[0], 'midtown-hall');
});

test('ownership, fee and sponsorship never change the order', () => {
  const queries = [{ guests: 60, budgetRange: '5k-15k', neighborhoods: ['the-gulch'] }, { guests: 20 }, { guests: 300, needs: ['av' as const] }, {}];
  for (const q of queries) {
    const baseline = rankVenues(pool, q).map((r) => `${r.venue.slug}:${r.score}`);
    const flipped = pool.map((v, i) => ({ ...v, ownedByBph: i % 2 === 0, feePct: i === 1 ? 12 : 3, featuredUntil: i === 3 ? '2099-01-01' : undefined }));
    assert.deepEqual(rankVenues(flipped, q).map((r) => `${r.venue.slug}:${r.score}`), baseline);
    const allOwned = pool.map((v) => ({ ...v, ownedByBph: true, featuredUntil: '2099-01-01', feePct: 20 }));
    assert.deepEqual(rankVenues(allOwned, q).map((r) => `${r.venue.slug}:${r.score}`), baseline);
  }
});

test('suggestions only include published venues with a published space, honour exclusions and the limit', () => {
  const withDrafts = [...pool, venue('draft', { published: false }), venue('no-space', {}, [space({ published: false })])];
  const picks = suggestVenues(withDrafts, { guests: 40 }, { limit: 2, excludeIds: ['id-gulch-room'] });
  assert.equal(picks.length, 2);
  assert.ok(!picks.some((p) => ['gulch-room', 'draft', 'no-space'].includes(p.venue.slug)));
});
