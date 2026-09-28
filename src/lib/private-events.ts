import type { EventSpace, EventVenue, Need, Occasion } from './events/types';

/**
 * Private events marketplace (/private-events/): the option lists the quick
 * brief, the inquiry form, the browse pages and the API route share. The
 * `event_type` and `budget_range` enums are the ones the `event_inquiries`
 * check constraints accept; do not widen them here without a migration.
 */
export const EVENT_TYPES = [
  { value: 'corporate', label: 'Corporate event' },
  { value: 'holiday', label: 'Holiday party' },
  { value: 'convention', label: 'Convention reception' },
  { value: 'celebration', label: 'Private celebration' },
  { value: 'other', label: 'Something else' },
] as const;
export type EventType = (typeof EVENT_TYPES)[number]['value'];

/**
 * The brief's budget, in the same bands the venue pages show. Stored on
 * event_inquiries.budget_range; the older dollar-range values stay legal in
 * the check constraint for rows written before the bands.
 */
export const BUDGET_RANGES = [
  { value: '$', label: '$ · under $2,500' },
  { value: '$$', label: '$$ · $2,500 to $5,000' },
  { value: '$$$', label: '$$$ · $5,000 to $10,000' },
  { value: '$$$$', label: '$$$$ · $10,000 to $25,000' },
  { value: '$$$$$', label: '$$$$$ · $25,000 and up' },
  { value: 'undecided', label: 'Not sure yet' },
] as const;
export type BudgetRange = (typeof BUDGET_RANGES)[number]['value'];

export function isEventType(value: unknown): value is EventType {
  return typeof value === 'string' && EVENT_TYPES.some((t) => t.value === value);
}
export function isBudgetRange(value: unknown): value is BudgetRange {
  return typeof value === 'string' && BUDGET_RANGES.some((b) => b.value === value);
}

/**
 * Occasions planners browse and brief by. `eventType` is the legacy enum the
 * inquiry row keeps for back-compat. `needs` orders the occasion's browse page
 * through venue-rank (fit only; never ownership or fee). `intro` is the
 * human-written editorial introduction for the browse page: while it is
 * empty the page is a filtered view whose canonical points at the hub, and it
 * becomes its own indexable page only once a person has written the intro.
 */
export interface EventOccasion {
  value: Occasion;
  slug: string;
  eventType: EventType;
  title: string;
  line: string;
  needs: Need[];
  intro?: string[];
}

export const EVENT_OCCASIONS: EventOccasion[] = [
  { value: 'corporate', slug: 'corporate', eventType: 'corporate', title: 'Corporate events', line: 'Team days, client dinners, offsites and milestones.', needs: ['av'] },
  { value: 'convention', slug: 'convention-receptions', eventType: 'convention', title: 'Convention receptions', line: 'Welcome receptions and off-site nights a short walk from the convention center.', needs: [] },
  { value: 'holiday', slug: 'holiday-parties', eventType: 'holiday', title: 'Holiday parties', line: 'End-of-year parties for teams of every size.', needs: ['food'] },
  { value: 'celebration', slug: 'celebrations', eventType: 'celebration', title: 'Celebrations', line: 'Birthdays, anniversaries and reunions.', needs: [] },
  { value: 'bachelorette', slug: 'bachelorette', eventType: 'celebration', title: 'Bachelorette weekends', line: 'A private room or a whole floor with the band downstairs.', needs: ['music'] },
  { value: 'rehearsal_dinner', slug: 'rehearsal-dinners', eventType: 'celebration', title: 'Rehearsal dinners', line: 'Seated dinners the night before.', needs: ['food'] },
  { value: 'welcome_party', slug: 'welcome-parties', eventType: 'celebration', title: 'Welcome parties', line: 'Standing receptions for out-of-town guests.', needs: [] },
];

export function occasionBySlug(slug: string): EventOccasion | undefined {
  return EVENT_OCCASIONS.find((o) => o.slug === slug);
}
export function occasionByValue(value: string | undefined): EventOccasion | undefined {
  return EVENT_OCCASIONS.find((o) => o.value === value);
}
export function isOccasion(value: unknown): value is Occasion {
  return value === 'other' || EVENT_OCCASIONS.some((o) => o.value === value);
}
/** The legacy `event_type` a given occasion stores. */
export function occasionToEventType(occasion: string | undefined): EventType {
  return occasionByValue(occasion)?.eventType ?? 'other';
}

/** Party-size bands for browsing. A space fits when the band overlaps its guest range. */
export interface SizeBand {
  slug: string;
  label: string;
  min: number;
  max: number;
}
export const SIZE_BANDS: SizeBand[] = [
  { slug: 'up-to-25', label: 'Up to 25', min: 1, max: 25 },
  { slug: '25-75', label: '25 to 75', min: 25, max: 75 },
  { slug: '75-200', label: '75 to 200', min: 75, max: 200 },
  { slug: '200-plus', label: '200 and up', min: 200, max: Number.POSITIVE_INFINITY },
];
export function sizeBandBySlug(slug: string): SizeBand | undefined {
  return SIZE_BANDS.find((b) => b.slug === slug);
}
type SpaceSize = Pick<EventSpace, 'seatedCapacity' | 'standingCapacity'> & { minGuests?: number };
export function spaceFitsBand(space: SpaceSize, band: SizeBand): boolean {
  const capacity = Math.max(space.seatedCapacity, space.standingCapacity);
  if (capacity <= 0) return false;
  const floor = space.minGuests ?? 1;
  return capacity >= band.min && floor <= band.max;
}
export function venueFitsBand(venue: { spaces: SpaceSize[] }, band: SizeBand): boolean {
  return venue.spaces.some((s) => spaceFitsBand(s, band));
}
/** Analytics band for a guest count, same edges as the browse bands. */
export function guestsBand(guests: number | undefined): string | undefined {
  if (!guests || guests < 1) return undefined;
  return SIZE_BANDS.find((b) => guests <= b.max)?.slug;
}

export const NEEDS: { value: Need; label: string }[] = [
  { value: 'food', label: 'Food and drink' },
  { value: 'music', label: 'Live music' },
  { value: 'av', label: 'AV and presentations' },
  { value: 'outdoor', label: 'Outdoor space' },
  { value: 'accessible', label: 'Step-free access' },
  { value: 'rooms', label: 'Hotel rooms for guests' },
];

export const START_TIME_BANDS = [
  { value: 'morning', label: 'Morning' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'late', label: 'Late night' },
] as const;

export const VENUE_KIND_LABEL: Record<EventVenue['kind'], string> = {
  bar: 'Bar',
  restaurant: 'Restaurant',
  music_venue: 'Music venue',
  rooftop: 'Rooftop',
  hotel: 'Hotel',
  event_space: 'Event space',
  other: 'Venue',
};

/** How it works, in the order it happens. The last line is the disclosure in one sentence. */
export const HOW_IT_WORKS = [
  { title: 'Send one brief', body: 'Occasion, headcount, date, budget and what you need. Two minutes.' },
  { title: 'Up to five venues get it', body: 'Your shortlist, or venues we pick for fit: capacity, minimum spend, neighborhood.' },
  { title: 'They reply within 24 business hours', body: 'Every listed venue has promised that. We chase the ones that miss it.' },
  { title: 'You confirm with the venue', body: 'Contract, deposit and the event itself are between you and the venue.' },
];
export const PAID_BY_VENUE = 'Nashville.com is paid by the venue only if you book. That never changes which venues we suggest or the order we show them in.';

/** Owned-venue disclosure, used verbatim wherever an owned venue is shown in full. */
export const OWNED_VENUE_DISCLOSURE = "Owned by BPH Hospitality, Nashville.com's parent company. Listed on the same terms as every other venue here.";

/** Shortlist: up to five venue slugs carried in `?v=`, never in storage. */
export const SHORTLIST_MAX = 5;
const SLUG = /^[a-z0-9-]{2,80}$/;
export function parseShortlist(raw: string | string[] | undefined | null): string[] {
  const text = Array.isArray(raw) ? raw.join(',') : raw ?? '';
  const out: string[] = [];
  for (const part of text.split(',')) {
    const slug = part.trim();
    if (SLUG.test(slug) && !out.includes(slug)) out.push(slug);
    if (out.length === SHORTLIST_MAX) break;
  }
  return out;
}
export function shortlistParam(slugs: string[]): string {
  return slugs.length ? `?v=${encodeURIComponent(slugs.join(','))}` : '';
}
/** Append the shortlist to a site path, keeping any hash at the end. */
export function withShortlist(path: string, slugs: string[]): string {
  if (!slugs.length) return path;
  const [base, hash] = path.split('#');
  return `${base}${shortlistParam(slugs)}${hash ? `#${hash}` : ''}`;
}

/** Values the quick brief hands to the full form through the URL. */
export interface BriefPrefill {
  type?: EventType;
  occasion?: Occasion;
  guests?: number;
  date?: string;
  flexible?: boolean;
}

/** The planner's countdown page for a sent brief. */
export function statusHref(reference: string): string {
  return `/private-events/status/${encodeURIComponent(reference)}/`;
}

/** The brief lives on its own page; every entry point hands its state there. */
export const BRIEF_PATH = '/private-events/brief/';

export interface BriefParams {
  prefill: BriefPrefill;
  shortlist: string[];
  /** A single venue the planner came from; joins the shortlist on the brief page. */
  venue?: string;
}

type Params = Record<string, string | string[] | undefined>;
function one(params: Params, key: string): string | undefined {
  const raw = params[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.trim() || undefined;
}

/** Read the brief's state from a URL: hub quick brief values, shortlist, single venue. */
export function readBriefParams(params: Params): BriefParams {
  const type = one(params, 'type');
  const occasion = one(params, 'occasion');
  const guests = Number(one(params, 'guests'));
  const date = one(params, 'date');
  const venue = one(params, 'venue');
  return {
    prefill: {
      type: isEventType(type) ? type : undefined,
      occasion: isOccasion(occasion) ? occasion : undefined,
      guests: Number.isInteger(guests) && guests > 0 && guests <= 5000 ? guests : undefined,
      date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) ? date : undefined,
      flexible: one(params, 'flexible') === '1',
    },
    shortlist: parseShortlist(params.v),
    venue: venue && SLUG.test(venue) ? venue : undefined,
  };
}

/** Link to the brief page carrying whatever state the caller has. */
export function briefHref(input: { occasion?: string; guests?: number | string; date?: string; flexible?: boolean; shortlist?: string[]; venue?: string } = {}): string {
  const sp = new URLSearchParams();
  if (input.occasion) sp.set('occasion', input.occasion);
  if (input.guests !== undefined && input.guests !== '' && Number(input.guests) > 0) sp.set('guests', String(input.guests));
  if (input.date) sp.set('date', input.date);
  if (input.flexible) sp.set('flexible', '1');
  if (input.shortlist?.length) sp.set('v', input.shortlist.slice(0, SHORTLIST_MAX).join(','));
  if (input.venue) sp.set('venue', input.venue);
  const qs = sp.toString();
  return qs ? `${BRIEF_PATH}?${qs}` : BRIEF_PATH;
}

/** "Date or month": a month-only answer is stored as the first of that month with flexible_dates set. */
export function monthOptions(count = 18, now = new Date()): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  for (let i = 0; i < count; i += 1) {
    const d = new Date(Date.UTC(y, m + i, 1));
    out.push({ value: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`, label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }) });
  }
  return out;
}
export function monthToDate(ym: string): string | undefined {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(ym) ? `${ym}-01` : undefined;
}
export function isMonthOnly(date: string | undefined, flexible: boolean): boolean {
  return Boolean(flexible && date && /^\d{4}-\d{2}-01$/.test(date));
}
/** "December 2026 (any date)", "Fri, Dec 31, 2026", "Fri, Dec 31, 2026 (flexible)" or "not set". */
export function formatBriefDate(date: string | undefined, flexible: boolean): string {
  if (!date) return flexible ? 'flexible' : 'not set';
  const [y, mo, d] = date.split('-').map(Number);
  const utc = new Date(Date.UTC(y, mo - 1, d));
  if (isMonthOnly(date, flexible)) return `${utc.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })} (any date)`;
  const day = utc.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  return flexible ? `${day} (flexible)` : day;
}
