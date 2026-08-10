import {
  fetchLiveEvents,
  TICKETMASTER_CONFIGURED,
  type FetchOptions,
  type LiveEvent,
} from './ticketmaster';
import { events as seedEvents } from '../content/listings';
import { getSupabaseServiceClient, isSupabaseConfigured } from '../supabase/server';

/**
 * Shared normalized calendar used by every public event surface.
 *
 * Source order:
 * 1. canonical published Supabase events (preferred production path)
 * 2. legacy direct Ticketmaster adapter during migration
 * 3. visibly labelled seed records for development only
 *
 * Seed records are never mixed into a live result set.
 */

function seedToLive(opts: FetchOptions = {}): LiveEvent[] {
  const classification = opts.classificationName?.trim().toLowerCase();
  const source = classification === 'music'
    ? seedEvents.filter((event) => event.category.toLowerCase() === 'concert')
    : seedEvents;

  return source
    .filter((event) => (!opts.startDate || event.startDate >= opts.startDate))
    .filter((event) => (!opts.endDate || event.startDate <= opts.endDate))
    .map((event) => ({
      id: event.slug,
      name: event.title,
      date: event.startDate,
      time: event.timeNote,
      venue: event.venue,
      city: 'Nashville',
      stateCode: 'TN',
      segment: event.category === 'Sports' ? 'Sports' : event.category === 'Concert' ? 'Music' : event.category,
      genre: event.category,
      ticketUrl: event.ticketUrl ?? `/events/${event.slug}/`,
      source: 'seed' as const,
    }));
}

type SupabaseEventRow = {
  id: string;
  name: string;
  event_type: string;
  starts_at: string;
  time_tbd: boolean;
  venue_name: string | null;
  status: string;
  ticket_url: string | null;
  event_source_links: Array<{
    source_url: string | null;
    expires_at: string | null;
    display_allowed: boolean;
    metadata: Record<string, unknown> | null;
    data_sources: { provider_key: string } | null;
  }> | null;
};

function nashvilleDateTime(iso: string, timeTbd: boolean): { date: string; time?: string } {
  const value = new Date(iso);
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const part = (type: string) => dateParts.find((p) => p.type === type)?.value || '';
  const date = `${part('year')}-${part('month')}-${part('day')}`;

  if (timeTbd) return { date };
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Chicago',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(value);
  return { date, time };
}

async function fetchSupabaseEvents(opts: FetchOptions = {}): Promise<{
  events: LiveEvent[];
  configured: boolean;
}> {
  if (!isSupabaseConfigured()) return { events: [], configured: false };
  const client = getSupabaseServiceClient();
  if (!client) return { events: [], configured: false };

  const { data: source } = await client
    .from('data_sources')
    .select('active')
    .eq('provider_key', 'ticketmaster')
    .maybeSingle();
  const configured = Boolean(source?.active);

  const start = opts.startDate ?? new Date().toISOString().slice(0, 10);
  const end = opts.endDate ?? new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10);
  // Query one day wider on each side, then filter by Nashville-local calendar date.
  const queryStart = new Date(`${start}T00:00:00Z`);
  queryStart.setUTCDate(queryStart.getUTCDate() - 1);
  const queryEnd = new Date(`${end}T23:59:59Z`);
  queryEnd.setUTCDate(queryEnd.getUTCDate() + 1);

  let query = client
    .from('events')
    .select(`
      id,name,event_type,starts_at,time_tbd,venue_name,status,ticket_url,
      event_source_links (
        source_url,expires_at,display_allowed,metadata,
        data_sources ( provider_key )
      )
    `)
    .eq('is_published', true)
    .in('status', ['scheduled', 'postponed'])
    .gte('starts_at', queryStart.toISOString())
    .lte('starts_at', queryEnd.toISOString())
    .order('starts_at', { ascending: true })
    .limit(Math.min(opts.size ?? 200, 500));

  if (opts.classificationName) {
    query = query.eq('event_type', opts.classificationName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_'));
  }

  const { data, error } = await query;
  if (error || !data) return { events: [], configured };

  const now = Date.now();
  const events = (data as unknown as SupabaseEventRow[])
    .map((row): LiveEvent | null => {
      const tm = (row.event_source_links ?? []).find(
        (link) => link.data_sources?.provider_key === 'ticketmaster' && link.display_allowed,
      );
      if (!tm) return null;
      // Expired source state is not considered live public data.
      if (tm.expires_at && Date.parse(tm.expires_at) < now) return null;

      const local = nashvilleDateTime(row.starts_at, row.time_tbd);
      if (local.date < start || local.date > end) return null;
      const meta = tm.metadata ?? {};
      const priceRaw = meta.priceFrom;
      const priceFrom = typeof priceRaw === 'number' ? priceRaw : undefined;

      return {
        id: row.id,
        name: row.name,
        date: local.date,
        time: local.time,
        venue: row.venue_name || 'Nashville venue',
        city: 'Nashville',
        stateCode: 'TN',
        segment: typeof meta.segment === 'string' ? meta.segment : row.event_type,
        genre: typeof meta.genre === 'string' ? meta.genre : undefined,
        subGenre: typeof meta.subGenre === 'string' ? meta.subGenre : undefined,
        priceFrom,
        currency: typeof meta.currency === 'string' ? meta.currency : undefined,
        ticketUrl: row.ticket_url || tm.source_url || '',
        imageUrl: typeof meta.imageUrl === 'string' ? meta.imageUrl : undefined,
        imageIsFallback: Boolean(meta.imageFallback),
        imageAttribution: typeof meta.imageAttribution === 'string' ? meta.imageAttribution : undefined,
        source: 'ticketmaster',
        onSaleStatus: typeof meta.onSaleStatus === 'string' ? meta.onSaleStatus : undefined,
      };
    })
    .filter((event): event is LiveEvent => Boolean(event?.ticketUrl));

  return { events, configured };
}

export interface CalendarResult {
  events: LiveEvent[];
  /** True when records came from a live Ticketmaster-backed source. */
  live: boolean;
  fetchedAt: string;
  configured: boolean;
}

export async function getCalendar(opts: FetchOptions = {}): Promise<CalendarResult> {
  const supabase = await fetchSupabaseEvents(opts);
  if (supabase.events.length > 0) {
    return {
      events: supabase.events.sort(
        (a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''),
      ),
      live: true,
      fetchedAt: new Date().toISOString(),
      configured: true,
    };
  }

  // Transitional fallback until the Ticketmaster key is moved into Supabase and
  // the first canonical sync succeeds. Remove once migration is complete.
  const legacyEvents = await fetchLiveEvents(opts);
  const useLegacy = legacyEvents.length > 0;

  return {
    events: (useLegacy ? legacyEvents : seedToLive(opts)).sort(
      (a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''),
    ),
    live: useLegacy,
    fetchedAt: new Date().toISOString(),
    configured: supabase.configured || TICKETMASTER_CONFIGURED,
  };
}

/** Distinct genres present in a set, for the filter controls. */
export function genresOf(events: LiveEvent[]): string[] {
  return Array.from(new Set(events.map((event) => event.genre).filter(Boolean) as string[])).sort();
}

/** Distinct venues present in a set, for the filter controls. */
export function venuesOf(events: LiveEvent[]): string[] {
  return Array.from(new Set(events.map((event) => event.venue))).sort();
}
