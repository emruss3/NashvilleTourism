import { fetchLiveEvents, TICKETMASTER_CONFIGURED, type LiveEvent } from './ticketmaster';
import { events as seedEvents } from '../content/listings';
import { neighborhoodName } from '../content/neighborhoods';

/**
 * The calendar the live-music directory renders.
 *
 * Prefers the Ticketmaster feed. When no key is configured, or the feed is
 * unreachable, it maps our seeded events into the same shape so the page still
 * works and is visibly labelled as sample data.
 */

function seedToLive(): LiveEvent[] {
  return seedEvents.map((e) => ({
    id: e.slug,
    name: e.title,
    date: e.startDate,
    time: e.timeNote,
    venue: e.venue,
    city: neighborhoodName(e.neighborhood),
    genre: e.category,
    ticketUrl: e.ticketUrl ?? `/events/${e.slug}/`,
    source: 'seed' as const,
  }));
}

export interface CalendarResult {
  events: LiveEvent[];
  /** True when the records came from the live feed. */
  live: boolean;
  /** Build timestamp, shown so readers know how fresh the page is. */
  fetchedAt: string;
  configured: boolean;
}

export async function getCalendar(): Promise<CalendarResult> {
  const live = await fetchLiveEvents();
  const useLive = live.length > 0;
  return {
    events: (useLive ? live : seedToLive()).sort((a, b) => a.date.localeCompare(b.date)),
    live: useLive,
    fetchedAt: new Date().toISOString(),
    configured: TICKETMASTER_CONFIGURED,
  };
}

/** Distinct genres present in a set, for the filter controls. */
export function genresOf(events: LiveEvent[]): string[] {
  return Array.from(new Set(events.map((e) => e.genre).filter(Boolean) as string[])).sort();
}

/** Distinct venues present in a set, for the filter controls. */
export function venuesOf(events: LiveEvent[]): string[] {
  return Array.from(new Set(events.map((e) => e.venue))).sort();
}
