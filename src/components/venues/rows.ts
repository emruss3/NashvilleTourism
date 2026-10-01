/**
 * Row shapes the dashboard reads and writes directly (snake_case, as the
 * tables hold them) under the signed-in venue user's row level security.
 */
export interface VenueRow {
  id: string;
  slug: string;
  name: string;
  kind: string;
  neighborhood_slug: string;
  address: string;
  lat: number | null;
  lng: number | null;
  summary: string;
  description: string | null;
  website: string | null;
  tour_url: string | null;
  hours_note: string | null;
  features: string[];
  deposit_terms: string | null;
  cancellation_terms: string | null;
  gratuity_note: string | null;
  minimum_notice: string | null;
  outside_catering: string | null;
  noise_curfew: string | null;
  insurance_note: string | null;
  parking_note: string | null;
  transit_note: string | null;
  verified_at: string | null;
  owned_by_bph: boolean;
  sales_contact_name: string | null;
  sales_contact_email: string | null;
  sales_contact_phone: string | null;
  lead_system: string;
  lead_system_endpoint: string | null;
  fee_pct: number | string;
  sla_hours: number;
  published: boolean;
  publish_requested_at: string | null;
  approved_at: string | null;
  updated_at: string;
}

export interface SpaceRow {
  id: string;
  venue_id: string;
  slug: string;
  name: string;
  summary: string | null;
  seated_capacity: number;
  standing_capacity: number;
  min_guests: number | null;
  pricing_model: 'room_fee' | 'min_spend' | 'per_person' | 'buyout';
  min_spend_cents: number | null;
  room_fee_cents: number | null;
  per_person_cents: number | null;
  per_person_max_cents: number | null;
  buyout_from_cents: number | null;
  fb_minimum_cents: number | null;
  pricing_note: string | null;
  av_included: boolean;
  av_note: string | null;
  outdoor: boolean;
  accessible: boolean;
  private_entrance: boolean;
  hours_note: string | null;
  blackout_note: string | null;
  sort_order: number;
  published: boolean;
  cocktail_capacity: number | null;
  banquet_capacity: number | null;
  theater_capacity: number | null;
  classroom_capacity: number | null;
  boardroom_capacity: number | null;
}

export interface PackageRow {
  id: string;
  venue_id: string;
  space_id: string | null;
  slug: string;
  name: string;
  summary: string | null;
  for_occasions: string[];
  min_guests: number | null;
  max_guests: number | null;
  price_cents: number;
  price_basis: 'total' | 'per_person';
  includes: string[];
  deposit_note: string | null;
  book_url: string | null;
  sort_order: number;
  published: boolean;
}

export interface MediaRow {
  id: string;
  venue_id: string;
  space_id: string | null;
  url: string;
  alt: string;
  credit: string | null;
  rights_cleared: boolean;
  sort_order: number;
  storage_path: string | null;
  kind: 'photo' | 'floor_plan' | 'video' | 'menu_pdf' | 'tour_poster';
  floor_label: string | null;
}

export interface AvailabilityRow {
  id: string;
  venue_id: string;
  space_id: string;
  month: string | null;
  day: string | null;
  status: 'open' | 'limited' | 'booked';
  note: string | null;
}

export const TERMS_COLUMNS = ['deposit_terms', 'cancellation_terms', 'gratuity_note', 'minimum_notice', 'outside_catering', 'noise_curfew', 'insurance_note', 'parking_note', 'transit_note'] as const;
export const TERMS_MAX: Record<(typeof TERMS_COLUMNS)[number], number> = { deposit_terms: 600, cancellation_terms: 600, gratuity_note: 300, minimum_notice: 200, outside_catering: 300, noise_curfew: 200, insurance_note: 300, parking_note: 300, transit_note: 300 };

export const VENUE_EDITABLE = ['name', 'kind', 'neighborhood_slug', 'address', 'lat', 'lng', 'summary', 'description', 'website', 'tour_url', 'hours_note', 'features', 'sales_contact_name', 'sales_contact_email', 'sales_contact_phone', 'lead_system', 'lead_system_endpoint', ...TERMS_COLUMNS] as const;

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Dollars typed in a field ↔ cents on the row. Empty means null. */
export function dollarsToCents(text: string): number | null {
  const t = text.replace(/[$,\s]/g, '');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}
export function centsToDollars(cents: number | null | undefined): string {
  return cents === null || cents === undefined ? '' : String(Math.round(cents) / 100);
}

/** Snake-case space row → the camelCase shape the public helpers and publish checks read. */
export function spaceView(s: SpaceRow) {
  return {
    name: s.name,
    summary: s.summary,
    seatedCapacity: s.seated_capacity,
    standingCapacity: s.standing_capacity,
    pricingModel: s.pricing_model,
    minSpendCents: s.min_spend_cents ?? undefined,
    roomFeeCents: s.room_fee_cents ?? undefined,
    perPersonCents: s.per_person_cents ?? undefined,
    perPersonMaxCents: s.per_person_max_cents ?? undefined,
    buyoutFromCents: s.buyout_from_cents ?? undefined,
    pricingNote: s.pricing_note,
    avNote: s.av_note,
    hoursNote: s.hours_note,
    blackoutNote: s.blackout_note,
  };
}
