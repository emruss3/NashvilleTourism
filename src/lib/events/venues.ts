import { getSupabaseServiceClient } from '@/lib/supabase/server';
import type { EventMedia, EventSpace, EventVenue, KeyDate } from './types';

/**
 * Server-side reads for the private events marketplace.
 *
 * Public reads (pages, ranking) come from the `event_venues_public` view:
 * published rows, public columns, the same surface anon gets. Two callers go
 * to the base table with the service role instead: routing and the watchdog
 * (`withContacts`, which is the only way to obtain sales contacts, lead system
 * and fee terms) and preview builds (`includeUnpublished`, gated on VERCEL_ENV
 * so unpublished seed venues render before production, never on a flag someone
 * could set by mistake). Contacts are never returned to a page.
 */

export function showUnpublished(): boolean {
  return (process.env.VERCEL_ENV ?? '').toLowerCase() !== 'production';
}

type VenueRow = Record<string, unknown>;

function num(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() && Number.isFinite(Number(v)) ? Number(v) : undefined;
}
function str(v: unknown): string | undefined {
  return typeof v === 'string' && v ? v : undefined;
}

function mapSpace(r: VenueRow): EventSpace {
  return {
    id: String(r.id),
    venueId: String(r.venue_id),
    slug: String(r.slug),
    name: String(r.name),
    summary: str(r.summary),
    seatedCapacity: num(r.seated_capacity) ?? 0,
    standingCapacity: num(r.standing_capacity) ?? 0,
    minGuests: num(r.min_guests),
    pricingModel: r.pricing_model as EventSpace['pricingModel'],
    minSpendCents: num(r.min_spend_cents),
    roomFeeCents: num(r.room_fee_cents),
    perPersonCents: num(r.per_person_cents),
    buyoutFromCents: num(r.buyout_from_cents),
    fbMinimumCents: num(r.fb_minimum_cents),
    pricingNote: str(r.pricing_note),
    avIncluded: Boolean(r.av_included),
    avNote: str(r.av_note),
    outdoor: Boolean(r.outdoor),
    accessible: Boolean(r.accessible),
    privateEntrance: Boolean(r.private_entrance),
    hoursNote: str(r.hours_note),
    blackoutNote: str(r.blackout_note),
    sortOrder: num(r.sort_order) ?? 0,
    published: Boolean(r.published),
  };
}

function mapVenue(r: VenueRow, spaces: EventSpace[], withContacts: boolean): EventVenue {
  return {
    id: String(r.id),
    slug: String(r.slug),
    name: String(r.name),
    kind: r.kind as EventVenue['kind'],
    neighborhoodSlug: String(r.neighborhood_slug),
    address: String(r.address),
    lat: num(r.lat),
    lng: num(r.lng),
    summary: String(r.summary ?? ''),
    description: str(r.description),
    website: str(r.website),
    ownedByBph: Boolean(r.owned_by_bph),
    placeId: str(r.place_id),
    slaHours: num(r.sla_hours) ?? 24,
    // The public view carries published rows only and no `published` column.
    published: 'published' in r ? Boolean(r.published) : true,
    featuredUntil: str(r.featured_until),
    editorialPriority: num(r.editorial_priority) ?? 0,
    spaces: spaces.filter((s) => s.venueId === String(r.id)).sort((a, b) => a.sortOrder - b.sortOrder),
    ...(withContacts
      ? {
          leadSystem: (r.lead_system as EventVenue['leadSystem']) ?? 'email',
          feePct: num(r.fee_pct) ?? 5,
          salesContactName: str(r.sales_contact_name),
          salesContactEmail: str(r.sales_contact_email),
          salesContactPhone: str(r.sales_contact_phone),
          leadSystemEndpoint: str(r.lead_system_endpoint),
        }
      : {}),
  };
}

/** Columns of the `event_venues_public` view, the anon surface. */
const VIEW_COLUMNS = 'id,slug,name,kind,neighborhood_slug,address,lat,lng,summary,description,website,owned_by_bph,place_id,sla_hours,featured_until,editorial_priority';
/** Base-table columns for preview reads: the view's columns plus `published`. */
const PREVIEW_COLUMNS = `${VIEW_COLUMNS},published`;
/** Base-table columns for routing: everything the marketplace needs to reach and pay a venue. */
const CONTACT_COLUMNS = `${PREVIEW_COLUMNS},lead_system,fee_pct,sales_contact_name,sales_contact_email,sales_contact_phone,lead_system_endpoint`;

export async function listVenues(opts: { includeUnpublished?: boolean; withContacts?: boolean; ids?: string[]; slugs?: string[] } = {}): Promise<EventVenue[]> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return [];
  const includeUnpublished = opts.includeUnpublished ?? showUnpublished();
  const withContacts = Boolean(opts.withContacts);
  const fromBase = withContacts || includeUnpublished;
  let q = supabase
    .from(fromBase ? 'event_venues' : 'event_venues_public')
    .select(withContacts ? CONTACT_COLUMNS : fromBase ? PREVIEW_COLUMNS : VIEW_COLUMNS)
    .order('editorial_priority', { ascending: false })
    .order('name');
  if (fromBase && !includeUnpublished) q = q.eq('published', true);
  if (opts.ids?.length) q = q.in('id', opts.ids);
  if (opts.slugs?.length) q = q.in('slug', opts.slugs);
  const { data: venues, error } = await q;
  if (error || !venues?.length) return [];
  const venueIds = venues.map((v) => String((v as unknown as VenueRow).id));
  let sq = supabase.from('event_spaces').select('*').in('venue_id', venueIds).order('sort_order');
  if (!includeUnpublished) sq = sq.eq('published', true);
  const { data: spaceRows } = await sq;
  const spaces = (spaceRows ?? []).map((r) => mapSpace(r as VenueRow));
  return venues.map((v) => mapVenue(v as unknown as VenueRow, spaces, withContacts));
}

export async function getVenueBySlug(slug: string, opts: { withContacts?: boolean } = {}): Promise<EventVenue | undefined> {
  const [venue] = await listVenues({ slugs: [slug], withContacts: opts.withContacts });
  return venue;
}

export async function listMedia(venueId: string): Promise<EventMedia[]> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return [];
  const { data } = await supabase.from('event_media').select('id,venue_id,space_id,url,alt,credit,sort_order').eq('venue_id', venueId).eq('rights_cleared', true).order('sort_order');
  return (data ?? []).map((r) => ({ id: String(r.id), venueId: String(r.venue_id), spaceId: str(r.space_id), url: String(r.url), alt: String(r.alt ?? ''), credit: str(r.credit), sortOrder: num(r.sort_order) ?? 0 }));
}

export async function listKeyDates(opts: { from?: string; limit?: number } = {}): Promise<KeyDate[]> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return [];
  const from = opts.from ?? new Date().toISOString().slice(0, 10);
  const { data } = await supabase.from('event_key_dates').select('date,label,kind').gte('date', from).order('date').limit(opts.limit ?? 8);
  return (data ?? []).map((r) => ({ date: String(r.date), label: String(r.label), kind: String(r.kind) }));
}
