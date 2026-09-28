/** Rows of the private events marketplace, as the site reads them. */

export type VenueKind = 'bar' | 'restaurant' | 'music_venue' | 'rooftop' | 'hotel' | 'event_space' | 'other';
export type LeadSystem = 'email' | 'tripleseat' | 'perfect_venue' | 'other';
export type PricingModel = 'room_fee' | 'min_spend' | 'per_person' | 'buyout';
export type Occasion = 'corporate' | 'holiday' | 'convention' | 'celebration' | 'bachelorette' | 'rehearsal_dinner' | 'welcome_party' | 'other';
export type LeadStatus = 'new' | 'routed' | 'replied' | 'proposal' | 'booked' | 'lost' | 'spam';
export type Need = 'food' | 'music' | 'av' | 'outdoor' | 'accessible' | 'rooms';

export interface EventSpace {
  id: string;
  venueId: string;
  slug: string;
  name: string;
  summary?: string;
  seatedCapacity: number;
  standingCapacity: number;
  minGuests?: number;
  pricingModel: PricingModel;
  minSpendCents?: number;
  roomFeeCents?: number;
  perPersonCents?: number;
  buyoutFromCents?: number;
  fbMinimumCents?: number;
  pricingNote?: string;
  avIncluded: boolean;
  avNote?: string;
  outdoor: boolean;
  accessible: boolean;
  privateEntrance: boolean;
  hoursNote?: string;
  blackoutNote?: string;
  sortOrder: number;
  published: boolean;
}

export interface EventVenue {
  id: string;
  slug: string;
  name: string;
  kind: VenueKind;
  neighborhoodSlug: string;
  address: string;
  lat?: number;
  lng?: number;
  summary: string;
  description?: string;
  website?: string;
  ownedByBph: boolean;
  placeId?: string;
  slaHours: number;
  published: boolean;
  featuredUntil?: string;
  editorialPriority: number;
  spaces: EventSpace[];
  /**
   * Commercial and contact fields are present only on a `withContacts` read
   * (routing, watchdog). Public reads come from the `event_venues_public`
   * view, which does not carry them, so no page or ranking can see them.
   */
  leadSystem?: LeadSystem;
  feePct?: number;
  salesContactName?: string;
  salesContactEmail?: string;
  salesContactPhone?: string;
  leadSystemEndpoint?: string;
}

export interface EventMedia {
  id: string;
  venueId: string;
  spaceId?: string;
  url: string;
  alt: string;
  credit?: string;
  sortOrder: number;
}

export interface KeyDate {
  date: string;
  label: string;
  kind: string;
}

/** True when any text on the venue or its spaces still carries a placeholder. */
export function hasPlaceholder(venue: EventVenue): boolean {
  const texts = [venue.name, venue.summary, venue.description, venue.address, ...venue.spaces.flatMap((s) => [s.name, s.summary, s.pricingNote, s.avNote, s.hoursNote, s.blackoutNote])];
  return texts.some((t) => typeof t === 'string' && /TODO/.test(t));
}

/** "from $2,500" derived from the price fields; never typed in copy. */
export function spaceFromPrice(space: EventSpace): { amount: number; basis: 'minimum spend' | 'room fee' | 'per person' | 'buyout' } | undefined {
  const fmt = (cents: number | undefined) => (cents !== undefined && cents > 0 ? cents / 100 : undefined);
  const candidates: Array<[number | undefined, 'minimum spend' | 'room fee' | 'per person' | 'buyout']> = [
    [fmt(space.minSpendCents), 'minimum spend'],
    [fmt(space.roomFeeCents), 'room fee'],
    [fmt(space.perPersonCents), 'per person'],
    [fmt(space.buyoutFromCents), 'buyout'],
  ];
  const preferred = { min_spend: 'minimum spend', room_fee: 'room fee', per_person: 'per person', buyout: 'buyout' }[space.pricingModel];
  const primary = candidates.find(([amount, basis]) => amount !== undefined && basis === preferred);
  const any = candidates.find(([amount]) => amount !== undefined);
  const pick = primary ?? any;
  return pick && pick[0] !== undefined ? { amount: pick[0], basis: pick[1] } : undefined;
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}
