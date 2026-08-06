/**
 * Ticketmaster Discovery API adapter.
 *
 * The public NashRoam calendar is intentionally Nashville-city only. Ticketmaster's
 * Nashville DMA is much broader than the city and can include Knoxville,
 * Chattanooga, Franklin, and other Tennessee markets, so the request uses city,
 * state, and country filters and we independently reject any returned venue whose
 * embedded location is not Nashville, Tennessee.
 *
 * Docs: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
 */

export interface LiveEvent {
  id: string;
  name: string;
  /** ISO date, local to the venue. */
  date: string;
  /** e.g. "20:00" or undefined when the time is not announced. */
  time?: string;
  venue: string;
  city: string;
  stateCode?: string;
  segment?: string;
  genre?: string;
  subGenre?: string;
  /** Lowest advertised price, when the API supplies one. */
  priceFrom?: number;
  currency?: string;
  ticketUrl: string;
  imageUrl?: string;
  imageIsFallback?: boolean;
  imageAttribution?: string;
  /** Where this record came from, shown to the reader. */
  source: 'ticketmaster' | 'seed';
  onSaleStatus?: string;
}

const API = 'https://app.ticketmaster.com/discovery/v2/events.json';
const NASHVILLE_CITY = 'nashville';
const NASHVILLE_STATE = 'TN';
const UNITED_STATES = 'US';

interface TmImage {
  url: string;
  width: number;
  ratio?: string;
  fallback?: boolean;
  attribution?: string;
}

interface TmVenue {
  name?: string;
  city?: { name?: string };
  state?: { stateCode?: string; name?: string };
  country?: { countryCode?: string; name?: string };
}

interface TmEvent {
  id: string;
  name: string;
  url: string;
  images?: TmImage[];
  dates?: { start?: { localDate?: string; localTime?: string }; status?: { code?: string } };
  classifications?: {
    segment?: { name?: string };
    genre?: { name?: string };
    subGenre?: { name?: string };
  }[];
  priceRanges?: { min?: number; currency?: string }[];
  _embedded?: { venues?: TmVenue[] };
}

interface ChosenImage {
  url: string;
  fallback: boolean;
  attribution?: string;
}

/** Prefer a real event image; use Ticketmaster's fallback only when no real image exists. */
function pickImage(images?: TmImage[]): ChosenImage | undefined {
  if (!images?.length) return undefined;

  const ranked = [...images].sort((a, b) => {
    if (Boolean(a.fallback) !== Boolean(b.fallback)) return a.fallback ? 1 : -1;
    if ((a.ratio === '16_9') !== (b.ratio === '16_9')) return a.ratio === '16_9' ? -1 : 1;
    const aDistance = Math.abs(a.width - 960);
    const bDistance = Math.abs(b.width - 960);
    return aDistance - bDistance;
  });

  const image = ranked[0];
  return {
    url: image.url,
    fallback: Boolean(image.fallback),
    attribution: image.attribution,
  };
}

function isNashvilleVenue(venue: TmVenue | undefined): venue is TmVenue {
  if (!venue?.city?.name) return false;

  const city = venue.city.name.trim().toLowerCase();
  const state = venue.state?.stateCode?.trim().toUpperCase();
  const country = venue.country?.countryCode?.trim().toUpperCase();

  if (city !== NASHVILLE_CITY) return false;
  if (state && state !== NASHVILLE_STATE) return false;
  if (country && country !== UNITED_STATES) return false;
  return true;
}

function normalise(e: TmEvent): LiveEvent | null {
  const date = e.dates?.start?.localDate;
  const venue = e._embedded?.venues?.[0];

  // Do not publish an event when we cannot independently confirm its venue is
  // in Nashville. The upstream city filter is useful, but this is the guardrail.
  if (!date || !e.url || !isNashvilleVenue(venue)) return null;

  const image = pickImage(e.images);
  const classification = e.classifications?.[0];

  return {
    id: e.id,
    name: e.name,
    date,
    time: e.dates?.start?.localTime?.slice(0, 5),
    venue: venue.name ?? 'Nashville venue',
    city: 'Nashville',
    stateCode: NASHVILLE_STATE,
    segment: classification?.segment?.name,
    genre: classification?.genre?.name,
    subGenre: classification?.subGenre?.name,
    priceFrom: e.priceRanges?.[0]?.min,
    currency: e.priceRanges?.[0]?.currency,
    ticketUrl: e.url,
    imageUrl: image?.url,
    imageIsFallback: image?.fallback,
    imageAttribution: image?.attribution,
    source: 'ticketmaster',
    onSaleStatus: e.dates?.status?.code,
  };
}

export interface FetchOptions {
  /** ISO date, inclusive. Defaults to today. */
  startDate?: string;
  /** ISO date, inclusive. Defaults to 60 days out. */
  endDate?: string;
  size?: number;
  /** Ticketmaster classification name, e.g. `music`. */
  classificationName?: string;
}

/**
 * Fetches upcoming events whose embedded venue is explicitly Nashville, TN.
 * Returns an empty array rather than throwing so the UI can label its fallback.
 */
export async function fetchLiveEvents(opts: FetchOptions = {}): Promise<LiveEvent[]> {
  const key = process.env.TICKETMASTER_API_KEY;
  if (!key) return [];

  const start = opts.startDate ?? new Date().toISOString().slice(0, 10);
  const end =
    opts.endDate ?? new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10);

  const url = new URL(API);
  url.searchParams.set('apikey', key);
  url.searchParams.set('city', 'Nashville');
  url.searchParams.set('stateCode', NASHVILLE_STATE);
  url.searchParams.set('countryCode', UNITED_STATES);
  url.searchParams.set('startDateTime', `${start}T00:00:00Z`);
  url.searchParams.set('endDateTime', `${end}T23:59:59Z`);
  url.searchParams.set('size', String(Math.min(opts.size ?? 200, 200)));
  url.searchParams.set('sort', 'date,asc');
  if (opts.classificationName) {
    url.searchParams.set('classificationName', opts.classificationName);
  }

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 1800 },
    });
    if (!res.ok) {
      console.warn(`[ticketmaster] ${res.status} ${res.statusText}. Falling back to seed data.`);
      return [];
    }

    const json = (await res.json()) as { _embedded?: { events?: TmEvent[] } };
    return (json._embedded?.events ?? [])
      .map(normalise)
      .filter((event): event is LiveEvent => event !== null);
  } catch (err) {
    console.warn('[ticketmaster] request failed. Falling back to seed data.', err);
    return [];
  }
}

export const TICKETMASTER_CONFIGURED = Boolean(process.env.TICKETMASTER_API_KEY);
