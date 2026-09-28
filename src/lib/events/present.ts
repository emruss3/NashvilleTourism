import { spaceFromPrice, type EventSpace, type EventVenue } from './types';

/** Presentation helpers shared by the venue cards and the venue page. */

export function venueCapacity(venue: Pick<EventVenue, 'spaces'>): { seated: number; standing: number } {
  return venue.spaces.reduce((acc, s) => ({ seated: Math.max(acc.seated, s.seatedCapacity), standing: Math.max(acc.standing, s.standingCapacity) }), { seated: 0, standing: 0 });
}

/** The lowest "from" price across a venue's spaces, with its basis. */
export function venueFromPrice(venue: Pick<EventVenue, 'spaces'>): ReturnType<typeof spaceFromPrice> {
  let best: ReturnType<typeof spaceFromPrice>;
  for (const space of venue.spaces) {
    const p = spaceFromPrice(space);
    if (p && (!best || p.amount < best.amount)) best = p;
  }
  return best;
}

export function spaceChips(space: EventSpace): string[] {
  const chips: string[] = [];
  if (space.avIncluded) chips.push('AV included');
  if (space.outdoor) chips.push('Outdoor');
  if (space.accessible) chips.push('Step-free');
  if (space.privateEntrance) chips.push('Private entrance');
  return chips;
}

export function venueChips(venue: Pick<EventVenue, 'spaces'>): string[] {
  const set = new Set<string>();
  for (const s of venue.spaces) for (const c of spaceChips(s)) set.add(c);
  return [...set];
}

/** Sponsored placement is a dated flag; it is labeled, and it never orders anything. */
export function isSponsored(venue: Pick<EventVenue, 'featuredUntil'>, today = new Date()): boolean {
  if (!venue.featuredUntil) return false;
  return venue.featuredUntil >= today.toISOString().slice(0, 10);
}

export function formatKeyDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
}
