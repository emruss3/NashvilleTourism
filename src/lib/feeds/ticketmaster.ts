/**
 * Ticketmaster Discovery API adapter.
 *
 * Written against the v2 Discovery `/events.json` schema. It runs at build time
 * when `TICKETMASTER_API_KEY` is set, and the calendar falls back to seeded
 * listings when it is not, so the page never renders empty.
 *
 * Docs: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
 *
 * Rate limits on the free tier are 5 requests/second and 5,000/day, which is
 * why this is a build-time fetch with a page-size of 200 rather than a
 * per-visitor call.
 */

export interface LiveEvent {
  id: string;
  name: string;
  /** ISO date, local to Nashville. */
  date: string;
  /** e.g. "20:00" or undefined when the time is not announced. */
  time?: string;
  venue: string;
  city: string;
  genre?: string;
  subGenre?: string;
  /** Lowest advertised price, when the API supplies one. */
  priceFrom?: number;
  currency?: string;
  ticketUrl: string;
  imageUrl?: string;
  /** Where this record came from, shown to the reader. */
  source: 'ticketmaster' | 'seed';
  onSaleStatus?: string;
}

const NASHVILLE_DMA = '343'; // Ticketmaster DMA id for Nashville
const API = 'https://app.ticketmaster.com/discovery/v2/events.json';

interface TmImage { url: string; width: number; ratio?: string }
interface TmEvent {
  id: string;
  name: string;
  url: string;
  images?: TmImage[];
  dates?: { start?: { localDate?: string; localTime?: string }; status?: { code?: string } };
  classifications?: { genre?: { name?: string }; subGenre?: { name?: string } }[];
  priceRanges?: { min?: number; currency?: string }[];
  _embedded?: { venues?: { name?: string; city?: { name?: string } }[] };
}

/** Picks a wide image around 640px, which is what the cards render at. */
function pickImage(images?: TmImage[]): string | undefined {
  if (!images?.length) return undefined;
  const wide = images.filter((i) => i.ratio === '16_9').sort((a, b) => a.width - b.width);
  return (wide.find((i) => i.width >= 640) ?? wide.at(-1) ?? images[0])?.url;
}

function normalise(e: TmEvent): LiveEvent | null {
  const date = e.dates?.start?.localDate;
  if (!date || !e.url) return null;
  const venue = e._embedded?.venues?.[0];
  return {
    id: e.id,
    name: e.name,
    date,
    time: e.dates?.start?.localTime?.slice(0, 5),
    venue: venue?.name ?? 'Venue to be announced',
    city: venue?.city?.name ?? 'Nashville',
    genre: e.classifications?.[0]?.genre?.name,
    subGenre: e.classifications?.[0]?.subGenre?.name,
    priceFrom: e.priceRanges?.[0]?.min,
    currency: e.priceRanges?.[0]?.currency,
    ticketUrl: e.url,
    imageUrl: pickImage(e.images),
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
  classificationName?: string;
}

/**
 * Fetches upcoming Nashville events. Returns an empty array (never throws) so a
 * feed outage degrades to the seeded calendar instead of failing the build.
 */
export async function fetchLiveEvents(opts: FetchOptions = {}): Promise<LiveEvent[]> {
  const key = process.env.TICKETMASTER_API_KEY;
  if (!key) return [];

  const start = opts.startDate ?? new Date().toISOString().slice(0, 10);
  const end =
    opts.endDate ?? new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10);

  const url = new URL(API);
  url.searchParams.set('apikey', key);
  url.searchParams.set('dmaId', NASHVILLE_DMA);
  url.searchParams.set('startDateTime', `${start}T00:00:00Z`);
  url.searchParams.set('endDateTime', `${end}T23:59:59Z`);
  url.searchParams.set('size', String(Math.min(opts.size ?? 200, 200)));
  url.searchParams.set('sort', 'date,asc');
  if (opts.classificationName) url.searchParams.set('classificationName', opts.classificationName);

  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      console.warn(`[ticketmaster] ${res.status} ${res.statusText}. Falling back to seed data.`);
      return [];
    }
    const json = (await res.json()) as { _embedded?: { events?: TmEvent[] } };
    return (json._embedded?.events ?? [])
      .map(normalise)
      .filter((e): e is LiveEvent => e !== null);
  } catch (err) {
    console.warn('[ticketmaster] request failed. Falling back to seed data.', err);
    return [];
  }
}

export const TICKETMASTER_CONFIGURED = Boolean(process.env.TICKETMASTER_API_KEY);
