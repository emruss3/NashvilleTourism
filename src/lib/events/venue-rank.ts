import type { EventSpace, EventVenue, Need, Occasion } from './types.ts';

/**
 * Venue suggestion and ordering for the private events marketplace.
 * Deterministic and unit-tested (tests/venue-rank.test.ts).
 *
 * Score = capacity fit x budget fit x neighborhood match x needs match x
 * editorial priority. Ownership (`ownedByBph`), fee (`feePct`) and
 * sponsorship (`featuredUntil`) are not inputs: the test flips each and
 * asserts the order never changes. Response time joins in Phase 2.
 */
export const VENUE_RANK_WEIGHTS = {
  /** A space whose capacity range does not fit the party still scores this much (never zero, so a near miss can surface). */
  capacityMiss: 0.15,
  /** A space with no price field scores this much on budget fit. */
  budgetUnknown: 0.6,
  /** Minimum spend above the band ceiling by up to 50% scores this; beyond, the miss floor. */
  budgetStretch: 0.5,
  budgetMiss: 0.2,
  /** Venue in one of the planner's neighborhoods vs. not. Empty preference = 1 for everyone. */
  neighborhoodMiss: 0.7,
  /** Each unmet need multiplies by this. */
  needMiss: 0.75,
  /** Editorial priority (content) scaled by this per point, capped. */
  editorialPerPoint: 0.002,
  editorialCap: 0.3,
} as const;

export interface RankQuery {
  guests?: number;
  budgetRange?: string;
  occasion?: Occasion | string;
  neighborhoods?: string[];
  needs?: Need[] | string[];
}

/** Budget band ceilings in dollars, from src/lib/private-events.ts values. */
const BUDGET_CEILING: Record<string, number | undefined> = {
  'under-5k': 5000,
  '5k-15k': 15000,
  '15k-50k': 50000,
  'over-50k': undefined,
  undecided: undefined,
};

function spaceCost(space: EventSpace): number | undefined {
  const cents = space.minSpendCents ?? space.roomFeeCents ?? space.buyoutFromCents ?? undefined;
  return cents !== undefined && cents > 0 ? cents / 100 : undefined;
}

export function capacityFit(space: EventSpace, guests?: number): number {
  if (!guests) return 1;
  const max = Math.max(space.seatedCapacity, space.standingCapacity);
  if (max <= 0) return VENUE_RANK_WEIGHTS.capacityMiss;
  if (space.minGuests && guests < space.minGuests) return VENUE_RANK_WEIGHTS.capacityMiss;
  if (guests > max) return VENUE_RANK_WEIGHTS.capacityMiss;
  // Prefer rooms sized to the party: full marks from 50% occupancy up.
  const occupancy = guests / max;
  return occupancy >= 0.5 ? 1 : 0.6 + 0.8 * occupancy;
}

export function budgetFit(space: EventSpace, budgetRange?: string): number {
  const ceiling = budgetRange ? BUDGET_CEILING[budgetRange] : undefined;
  if (!ceiling) return 1;
  const cost = spaceCost(space);
  if (cost === undefined) return VENUE_RANK_WEIGHTS.budgetUnknown;
  if (cost <= ceiling) return 1;
  if (cost <= ceiling * 1.5) return VENUE_RANK_WEIGHTS.budgetStretch;
  return VENUE_RANK_WEIGHTS.budgetMiss;
}

export function needsFit(venue: EventVenue, space: EventSpace, needs: string[] = []): number {
  let score = 1;
  for (const need of needs) {
    const met =
      need === 'av' ? space.avIncluded :
      need === 'outdoor' ? space.outdoor :
      need === 'accessible' ? space.accessible :
      need === 'music' ? venue.kind === 'music_venue' || venue.kind === 'bar' :
      need === 'rooms' ? venue.kind === 'hotel' :
      true; // food: every listed venue caters or allows it; not a discriminator in Phase 1
    if (!met) score *= VENUE_RANK_WEIGHTS.needMiss;
  }
  return score;
}

export interface RankedVenue {
  venue: EventVenue;
  /** The best-fitting published space, when one exists. */
  space?: EventSpace;
  score: number;
}

function neighborhoodFit(venue: EventVenue, prefs: string[] = []): number {
  if (!prefs.length) return 1;
  return prefs.includes(venue.neighborhoodSlug) ? 1 : VENUE_RANK_WEIGHTS.neighborhoodMiss;
}

function editorialBoost(venue: EventVenue): number {
  return 1 + Math.min(VENUE_RANK_WEIGHTS.editorialCap, Math.max(0, venue.editorialPriority) * VENUE_RANK_WEIGHTS.editorialPerPoint);
}

/** Score every venue (via its best space) and order them. Ties break on slug so the order is stable. */
export function rankVenues(venues: EventVenue[], query: RankQuery = {}): RankedVenue[] {
  const ranked: RankedVenue[] = venues.map((venue) => {
    const spaces = venue.spaces.filter((s) => s.published);
    let best: { space: EventSpace; score: number } | undefined;
    for (const space of spaces) {
      const score = capacityFit(space, query.guests) * budgetFit(space, query.budgetRange) * needsFit(venue, space, query.needs as string[]);
      if (!best || score > best.score) best = { space, score };
    }
    const base = best ? best.score : VENUE_RANK_WEIGHTS.capacityMiss * VENUE_RANK_WEIGHTS.budgetUnknown;
    const score = base * neighborhoodFit(venue, query.neighborhoods) * editorialBoost(venue);
    return { venue, space: best?.space, score: Math.round(score * 10_000) / 10_000 };
  });
  ranked.sort((a, b) => b.score - a.score || a.venue.slug.localeCompare(b.venue.slug));
  return ranked;
}

/** Up to `limit` published venues for a brief, excluding any slugs given. */
export function suggestVenues(venues: EventVenue[], query: RankQuery, opts: { limit?: number; excludeIds?: string[] } = {}): RankedVenue[] {
  const exclude = new Set(opts.excludeIds ?? []);
  return rankVenues(
    venues.filter((v) => v.published && !exclude.has(v.id) && v.spaces.some((s) => s.published)),
    query,
  ).slice(0, opts.limit ?? 5);
}
