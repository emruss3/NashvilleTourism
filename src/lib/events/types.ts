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
  perPersonMaxCents?: number;
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
  /** Layout capacities (Phase 2); any may be unset. */
  cocktailCapacity?: number;
  banquetCapacity?: number;
  theaterCapacity?: number;
  classroomCapacity?: number;
  boardroomCapacity?: number;
}

/** Plain-text terms a venue states up front; all optional, public on the Terms tab. */
export interface VenueTerms {
  depositTerms?: string;
  cancellationTerms?: string;
  gratuityNote?: string;
  minimumNotice?: string;
  outsideCatering?: string;
  noiseCurfew?: string;
  insuranceNote?: string;
  parkingNote?: string;
  transitNote?: string;
}

export const TERMS_LABELS: Array<[keyof VenueTerms, string]> = [
  ['depositTerms', 'Deposit'],
  ['cancellationTerms', 'Cancellation'],
  ['minimumNotice', 'Minimum notice'],
  ['gratuityNote', 'Service charge and gratuity'],
  ['outsideCatering', 'Outside catering'],
  ['noiseCurfew', 'Noise and curfew'],
  ['insuranceNote', 'Insurance'],
  ['parkingNote', 'Parking'],
  ['transitNote', 'Getting there'],
];

export type MediaKind = 'photo' | 'floor_plan' | 'video' | 'menu_pdf' | 'tour_poster';
export type AvailabilityStatus = 'open' | 'limited' | 'booked';

/** One availability row: a month (YYYY-MM) or a single day (YYYY-MM-DD) for one space. */
export interface SpaceAvailability {
  spaceId: string;
  venueId: string;
  month?: string;
  day?: string;
  status: AvailabilityStatus;
  note?: string;
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
  tourUrl?: string;
  hoursNote?: string;
  features: string[];
  terms: VenueTerms;
  /** Set by the desk after a visit or a call; the badge shows only when set. */
  verifiedAt?: string;
  spaces: EventSpace[];
  /**
   * Commercial and contact fields are present only on a `withContacts` read
   * (routing, watchdog). Public reads come from the `event_venues_public`
   * view, which does not carry them, so no page or ranking can see them.
   */
  leadSystem?: LeadSystem;
  feePct?: number;
  approvedAt?: string;
  publishRequestedAt?: string;
  salesContactName?: string;
  salesContactEmail?: string;
  salesContactPhone?: string;
  leadSystemEndpoint?: string;
}

export interface EventPackage {
  id: string;
  venueId: string;
  spaceId?: string;
  slug: string;
  name: string;
  summary?: string;
  forOccasions: string[];
  minGuests?: number;
  maxGuests?: number;
  priceCents: number;
  priceBasis: 'total' | 'per_person';
  includes: string[];
  depositNote?: string;
  bookUrl?: string;
  sortOrder: number;
  published: boolean;
}

export interface EventMedia {
  id: string;
  venueId: string;
  spaceId?: string;
  url: string;
  alt: string;
  credit?: string;
  sortOrder: number;
  kind: MediaKind;
  /** Floor plans: "Floor 3" or "Rooftop". */
  floorLabel?: string;
}

export interface KeyDate {
  date: string;
  label: string;
  kind: string;
}

/** True when any text on the venue or its spaces still carries a placeholder. */
export function hasPlaceholder(venue: EventVenue): boolean {
  const texts = [venue.name, venue.summary, venue.description, venue.address, venue.hoursNote, ...venue.spaces.flatMap((s) => [s.name, s.summary, s.pricingNote, s.avNote, s.hoursNote, s.blackoutNote])];
  return texts.some((t) => typeof t === 'string' && /TODO/.test(t));
}

/**
 * Public pages show a price band, never the stored minimum. The exact number
 * stays on the row for ranking, filtering and fee estimates. "From $X" is for
 * packages only (Phase 3); no space ever renders it.
 */
export type PriceBand = '$' | '$$' | '$$$' | '$$$$' | '$$$$$';
export const PRICE_BANDS: { band: PriceBand; max?: number; label: string }[] = [
  { band: '$', max: 2500, label: 'under $2,500' },
  { band: '$$', max: 5000, label: '$2,500 to $5,000' },
  { band: '$$$', max: 10000, label: '$5,000 to $10,000' },
  { band: '$$$$', max: 25000, label: '$10,000 to $25,000' },
  { band: '$$$$$', label: '$25,000 and up' },
];
export function priceBandForAmount(dollars: number): PriceBand {
  return (PRICE_BANDS.find((b) => b.max === undefined || dollars < b.max) ?? PRICE_BANDS[PRICE_BANDS.length - 1]).band;
}
export function priceBandLabel(band: PriceBand): string {
  return PRICE_BANDS.find((b) => b.band === band)!.label;
}
/** The event-level number a space starts from (minimum spend, room fee or buyout), in dollars. Never shown. */
export function spaceEventCost(space: Pick<EventSpace, 'minSpendCents' | 'roomFeeCents' | 'buyoutFromCents' | 'pricingModel'>): number | undefined {
  const preferred = space.pricingModel === 'room_fee' ? space.roomFeeCents : space.pricingModel === 'buyout' ? space.buyoutFromCents : space.minSpendCents;
  const cents = preferred && preferred > 0 ? preferred : [space.minSpendCents, space.roomFeeCents, space.buyoutFromCents].find((c) => c !== undefined && c > 0);
  return cents !== undefined && cents > 0 ? cents / 100 : undefined;
}
export function spacePriceBand(space: Pick<EventSpace, 'minSpendCents' | 'roomFeeCents' | 'buyoutFromCents' | 'pricingModel'>): { band: PriceBand; basis: 'minimum spend' | 'room fee' | 'buyout' } | undefined {
  const cost = spaceEventCost(space);
  if (cost === undefined) return undefined;
  const basis = space.pricingModel === 'room_fee' && space.roomFeeCents ? 'room fee' : space.pricingModel === 'buyout' && space.buyoutFromCents ? 'buyout' : space.minSpendCents ? 'minimum spend' : space.roomFeeCents ? 'room fee' : 'buyout';
  return { band: priceBandForAmount(cost), basis };
}
/** The optional per-person range, when the venue prices that way. */
export function perPersonRange(space: Pick<EventSpace, 'perPersonCents' | 'perPersonMaxCents'>): { min: number; max?: number } | undefined {
  if (!space.perPersonCents || space.perPersonCents <= 0) return undefined;
  const max = space.perPersonMaxCents && space.perPersonMaxCents > space.perPersonCents ? space.perPersonMaxCents / 100 : undefined;
  return { min: space.perPersonCents / 100, max };
}
export function formatPerPerson(range: { min: number; max?: number }): string {
  return range.max ? `${formatUsd(range.min)} to ${formatUsd(range.max)} a person` : `about ${formatUsd(range.min)} a person`;
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}
