import {
  fetchLiveEvents,
  TICKETMASTER_CONFIGURED,
  type FetchOptions,
  type LiveEvent,
} from './ticketmaster';
import { events as seedEvents } from '../content/listings';

/**
 * Shared normalized calendar used by every public event surface.
 *
 * Ticketmaster is the source of truth when configured. Seed records exist only
 * as a visibly labelled development fallback and are never mixed into a live
 * result set.
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

export interface CalendarResult {
  events: LiveEvent[];
  /** True when the records came from Ticketmaster. */
  live: boolean;
  fetchedAt: string;
  configured: boolean;
}

export async function getCalendar(opts: FetchOptions = {}): Promise<CalendarResult> {
  const liveEvents = await fetchLiveEvents(opts);
  const useLive = liveEvents.length > 0;

  return {
    events: (useLive ? liveEvents : seedToLive(opts)).sort(
      (a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''),
    ),
    live: useLive,
    fetchedAt: new Date().toISOString(),
    configured: TICKETMASTER_CONFIGURED,
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
