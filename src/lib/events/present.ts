import { PRICE_BANDS, perPersonRange, spacePriceBand, type EventSpace, type EventVenue, type PriceBand } from './types';

/** Presentation helpers shared by the venue cards and the venue page. */

export function venueCapacity(venue: Pick<EventVenue, 'spaces'>): { seated: number; standing: number } {
  return venue.spaces.reduce((acc, s) => ({ seated: Math.max(acc.seated, s.seatedCapacity), standing: Math.max(acc.standing, s.standingCapacity) }), { seated: 0, standing: 0 });
}

/** The span of price bands across a venue's spaces, e.g. "$$" or "$$ to $$$$". Never a number. */
export function venueBandRange(venue: Pick<EventVenue, 'spaces'>): { min: PriceBand; max: PriceBand } | undefined {
  const bands = venue.spaces.map((s) => spacePriceBand(s)?.band).filter((b): b is PriceBand => Boolean(b));
  if (!bands.length) return undefined;
  const order = PRICE_BANDS.map((b) => b.band);
  const sorted = bands.slice().sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return { min: sorted[0], max: sorted[sorted.length - 1] };
}
export function formatBandRange(range: { min: PriceBand; max: PriceBand }): string {
  return range.min === range.max ? range.min : `${range.min} to ${range.max}`;
}
/** The widest per-person range across a venue's spaces, when any prices that way. */
export function venuePerPerson(venue: Pick<EventVenue, 'spaces'>): { min: number; max?: number } | undefined {
  const ranges = venue.spaces.map((s) => perPersonRange(s)).filter((r): r is NonNullable<typeof r> => Boolean(r));
  if (!ranges.length) return undefined;
  const min = Math.min(...ranges.map((r) => r.min));
  const tops = ranges.map((r) => r.max ?? r.min);
  const max = Math.max(...tops);
  return { min, max: max > min ? max : undefined };
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
