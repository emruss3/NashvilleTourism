import { attractions, restaurants, venues } from '@/lib/content/listings';
import { neighborhoods, neighborhoodName } from '@/lib/content/neighborhoods';
import { venues as contentVenues } from '@/lib/content/listings';
import { normalizeVenueName, venueNeighborhood } from '@/lib/event-neighborhoods';
import type { LiveEvent } from '@/lib/feeds/ticketmaster';
import type { ImageRef } from '@/lib/types';

/**
 * Discovery model behind the homepage discovery band and /explore/.
 * Filters are URL-addressable so Back and reload preserve them.
 */

export const INTERESTS = [
  { value: 'music', label: 'Music' },
  { value: 'food-drink', label: 'Eat & drink' },
  { value: 'arts', label: 'Arts & museums' },
  { value: 'nightlife', label: 'Nightlife' },
  { value: 'outdoors', label: 'Outdoors' },
  { value: 'family', label: 'Family' },
] as const;

export type Interest = (typeof INTERESTS)[number]['value'];

export const WHEN_OPTIONS = [
  { value: 'tonight', label: 'Tonight' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'weekend', label: 'This weekend' },
  { value: 'week', label: 'Next 7 days' },
] as const;

export type When = (typeof WHEN_OPTIONS)[number]['value'];

export interface ExploreQuery {
  neighborhood?: string;
  interest?: Interest;
  from?: string;
  to?: string;
  when?: When;
  q?: string;
  page: number;
}

export interface ExploreItem {
  kind: 'event' | 'place';
  id: string;
  title: string;
  href: string;
  external: boolean;
  /** Small caps line: category and neighborhood or venue. */
  meta: string;
  /** Event date in YYYY-MM-DD (Nashville local) when applicable. */
  date?: string;
  time?: string;
  price?: string;
  summary?: string;
  image?: ImageRef;
  /** Sponsored placement flag, so editorial and paid rows stay distinguishable. */
  sponsored?: boolean;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export function isInterest(value: unknown): value is Interest {
  return typeof value === 'string' && INTERESTS.some((i) => i.value === value);
}

export function isWhen(value: unknown): value is When {
  return typeof value === 'string' && WHEN_OPTIONS.some((w) => w.value === value);
}

function cleanDay(value: unknown): string | undefined {
  return typeof value === 'string' && ISO_DAY.test(value) ? value : undefined;
}

/** Parse and sanitise search params into a query. Unknown values are dropped. */
export function parseExploreQuery(params: Record<string, string | string[] | undefined>): ExploreQuery {
  const one = (key: string) => {
    const raw = params[key];
    return Array.isArray(raw) ? raw[0] : raw;
  };
  const neighborhood = one('neighborhood');
  const interest = one('interest');
  const when = one('when');
  const page = Number.parseInt(one('page') || '1', 10);
  const q = (one('q') || '').trim().slice(0, 80);
  return {
    neighborhood: neighborhoods.some((n) => n.slug === neighborhood) ? neighborhood : undefined,
    interest: isInterest(interest) ? interest : undefined,
    when: isWhen(when) ? when : undefined,
    from: cleanDay(one('from')),
    to: cleanDay(one('to')),
    q: q || undefined,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export function hasFilters(query: ExploreQuery): boolean {
  return Boolean(query.neighborhood || query.interest || query.when || query.from || query.to || query.q);
}

/** Build an /explore/ href from a query, omitting empty values. */
export function exploreHref(query: Partial<ExploreQuery>): string {
  const params = new URLSearchParams();
  if (query.neighborhood) params.set('neighborhood', query.neighborhood);
  if (query.interest) params.set('interest', query.interest);
  if (query.when) params.set('when', query.when);
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.q) params.set('q', query.q);
  if (query.page && query.page > 1) params.set('page', String(query.page));
  const qs = params.toString();
  return qs ? `/explore/?${qs}` : '/explore/';
}

/** Today's date in Nashville, as YYYY-MM-DD. */
export function nashvilleToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function shiftDay(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Resolve the date window for a query in Nashville time. `when` wins over
 * explicit dates. "Tonight" is today; "this weekend" is Friday to Sunday of
 * the current week (or the weekend in progress).
 */
export function resolveWindow(query: ExploreQuery, now = new Date()): { from?: string; to?: string; label?: string } {
  const today = nashvilleToday(now);
  if (query.when === 'tonight') return { from: today, to: today, label: 'Tonight' };
  if (query.when === 'tomorrow') {
    const tomorrow = shiftDay(today, 1);
    return { from: tomorrow, to: tomorrow, label: 'Tomorrow' };
  }
  if (query.when === 'week') return { from: today, to: shiftDay(today, 6), label: 'Next 7 days' };
  if (query.when === 'weekend') {
    const day = new Date(`${today}T12:00:00Z`).getUTCDay();
    const fridayOffset = day === 6 ? -1 : day === 0 ? -2 : 5 - day;
    const friday = shiftDay(today, fridayOffset);
    return { from: friday, to: shiftDay(friday, 2), label: 'This weekend' };
  }
  if (query.from || query.to) {
    const from = query.from ?? query.to;
    const to = query.to ?? query.from;
    return { from, to, label: from === to ? formatDay(from!) : `${formatDay(from!)} to ${formatDay(to!)}` };
  }
  return {};
}

export function formatDay(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' }).format(d);
}

function isSample(title: string, slug: string) {
  return title.startsWith('[Sample]') || slug.startsWith('sample-');
}

const ARTS = new Set(['Museum', 'Landmark']);
const OUTDOORS = new Set(['Park', 'Garden', 'Landmark']);
const FAMILY = new Set(['Museum', 'Park', 'Garden', 'Family', 'Market']);
const FOOD = new Set(['Market', 'Food & Drink']);

/** Editorial places matching the interest and neighborhood filters. */
export function explorePlaces(query: ExploreQuery): ExploreItem[] {
  const interest = query.interest;
  const hood = query.neighborhood;
  const q = query.q?.toLowerCase();
  const items: ExploreItem[] = [];

  const matchesText = (...fields: (string | undefined)[]) =>
    !q || fields.some((f) => f?.toLowerCase().includes(q));

  if (!interest || interest === 'food-drink') {
    for (const r of restaurants) {
      if (isSample(r.title, r.slug)) continue;
      if (hood && r.neighborhood !== hood) continue;
      if (!matchesText(r.title, r.summary, r.cuisine, neighborhoodName(r.neighborhood))) continue;
      items.push({
        kind: 'place',
        id: `restaurant-${r.slug}`,
        title: r.title,
        href: `/restaurants/${r.slug}/`,
        external: false,
        meta: [r.cuisine, neighborhoodName(r.neighborhood)].filter(Boolean).join(' · '),
        summary: r.summary,
        image: r.image,
        sponsored: r.placement === 'sponsored',
      });
    }
  }

  if (!interest || interest === 'music' || interest === 'nightlife') {
    for (const v of venues) {
      if (isSample(v.title, v.slug)) continue;
      if (hood && v.neighborhood !== hood) continue;
      if (!matchesText(v.title, v.summary, v.genres.join(' '), neighborhoodName(v.neighborhood))) continue;
      items.push({
        kind: 'place',
        id: `venue-${v.slug}`,
        title: v.title,
        href: `/music/${v.slug}/`,
        external: false,
        meta: ['Live music', neighborhoodName(v.neighborhood)].join(' · '),
        summary: v.summary,
        image: v.image,
        sponsored: v.placement === 'sponsored',
      });
    }
  }

  for (const a of attractions) {
    if (isSample(a.title, a.slug)) continue;
    if (hood && a.neighborhood !== hood) continue;
    const ok =
      !interest ||
      (interest === 'arts' && ARTS.has(a.category)) ||
      (interest === 'outdoors' && OUTDOORS.has(a.category)) ||
      (interest === 'family' && FAMILY.has(a.category)) ||
      (interest === 'food-drink' && FOOD.has(a.category));
    if (!ok) continue;
    if (!matchesText(a.title, a.summary, a.category, neighborhoodName(a.neighborhood))) continue;
    items.push({
      kind: 'place',
      id: `attraction-${a.slug}`,
      title: a.title,
      href: `/things-to-do/${a.slug}/`,
      external: false,
      meta: [a.category, neighborhoodName(a.neighborhood)].join(' · '),
      summary: a.summary,
      image: a.image,
      sponsored: a.placement === 'sponsored',
    });
  }

  return items.sort((a, b) => a.title.localeCompare(b.title));
}

function eventMatchesInterest(event: LiveEvent, interest?: Interest): boolean {
  if (!interest) return true;
  const segment = (event.segment || '').toLowerCase();
  const genre = (event.genre || '').toLowerCase();
  switch (interest) {
    case 'music':
    case 'nightlife':
      return segment.includes('music');
    case 'arts':
      return segment.includes('arts') || segment.includes('theatre') || segment.includes('theater');
    case 'family':
      return segment.includes('family') || genre.includes('family') || genre.includes('children');
    case 'food-drink':
      return genre.includes('food') || genre.includes('drink') || genre.includes('culinary');
    case 'outdoors':
      return segment.includes('sports');
    default:
      return true;
  }
}

/**
 * Neighborhood of a live event, from the venue name: our own venue listings
 * first, then the ticketed-venue map. Undefined when we cannot place it.
 */
export function eventNeighborhood(venue: string): string | undefined {
  const key = normalizeVenueName(venue);
  if (!key) return undefined;
  const listed = contentVenues.find((v) => {
    const title = normalizeVenueName(v.title);
    return title && (key.includes(title) || title.includes(key));
  });
  return listed?.neighborhood ?? venueNeighborhood(venue);
}

/**
 * Live events matching the query. A neighborhood filter keeps only events
 * whose venue we can place in that neighborhood; events at venues we cannot
 * place are left out rather than shown city-wide under the wrong heading.
 */
export function exploreEvents(events: LiveEvent[], query: ExploreQuery, now = new Date()): ExploreItem[] {
  const window = resolveWindow(query, now);
  const q = query.q?.toLowerCase();
  return events
    .filter((e) => (!window.from || e.date >= window.from) && (!window.to || e.date <= window.to))
    .filter((e) => !query.neighborhood || eventNeighborhood(e.venue) === query.neighborhood)
    .filter((e) => eventMatchesInterest(e, query.interest))
    .filter((e) => !q || e.name.toLowerCase().includes(q) || e.venue.toLowerCase().includes(q))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))
    .map((e) => ({
      kind: 'event' as const,
      id: `event-${e.id}`,
      title: e.name,
      href: e.ticketUrl,
      external: /^https?:\/\//i.test(e.ticketUrl),
      meta: [e.genre || e.segment, e.venue, eventNeighborhood(e.venue) ? neighborhoodName(eventNeighborhood(e.venue)!) : undefined].filter(Boolean).join(' · '),
      date: e.date,
      time: e.time,
      price:
        typeof e.priceFrom === 'number'
          ? `From ${new Intl.NumberFormat('en-US', { style: 'currency', currency: e.currency || 'USD', maximumFractionDigits: 0 }).format(e.priceFrom)}`
          : undefined,
    }));
}

export function neighborhoodOptions(): { value: string; label: string }[] {
  return neighborhoods.map((n) => ({ value: n.slug, label: n.name }));
}

export const EXPLORE_PAGE_SIZE = 24;
