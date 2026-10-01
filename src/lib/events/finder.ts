import { neighborhoods } from '../content/neighborhoods.ts';
import { SIZE_BANDS, sizeBandBySlug, spaceFitsBand, type SizeBand } from '../private-events.ts';
import type { EventSpace, Need, Occasion, VenueKind } from './types.ts';

/**
 * The event finder on /private-events/: four inputs (event type, group
 * size, area, up to three priorities) and a recommendation that changes
 * with them. Pure and unit-tested (tests/events-finder.test.ts).
 *
 * The format, area and considerations are editorial rules over the inputs
 * and the neighborhood content. Named spaces come only from the venue rows
 * handed in: capacities, features and neighborhoods are read, never
 * assumed, and ownership, fee and sponsorship are not inputs.
 */

export type FinderEventType = 'corporate' | 'holiday' | 'convention' | 'offsite' | 'celebration' | 'bachelorette' | 'rehearsal_dinner' | 'welcome_party' | 'other';

export interface FinderEventTypeDef {
  value: FinderEventType;
  label: string;
  /** The `occasion` the brief stores; `offsite` is a corporate event in the row. */
  occasion: Occasion;
  /** Promoted types appear first in the finder and the brief. */
  promoted: boolean;
  line: string;
}

export const FINDER_EVENT_TYPES: FinderEventTypeDef[] = [
  { value: 'corporate', label: 'Corporate event', occasion: 'corporate', promoted: true, line: 'Client dinners, milestones, awards nights and team celebrations.' },
  { value: 'holiday', label: 'Holiday party', occasion: 'holiday', promoted: true, line: 'End-of-year parties for teams of every size.' },
  { value: 'convention', label: 'Convention reception', occasion: 'convention', promoted: true, line: 'Welcome receptions and off-site nights for a conference crowd.' },
  { value: 'offsite', label: 'Team off-site', occasion: 'corporate', promoted: true, line: 'A working day with a meal, away from the office.' },
  { value: 'celebration', label: 'Private celebration', occasion: 'celebration', promoted: true, line: 'Birthdays, anniversaries and reunions.' },
  { value: 'bachelorette', label: 'Bachelorette weekend', occasion: 'bachelorette', promoted: false, line: 'A private room or a whole floor with the band downstairs.' },
  { value: 'rehearsal_dinner', label: 'Rehearsal dinner', occasion: 'rehearsal_dinner', promoted: false, line: 'Seated dinners the night before.' },
  { value: 'welcome_party', label: 'Welcome party', occasion: 'welcome_party', promoted: false, line: 'Standing receptions for out-of-town guests.' },
  { value: 'other', label: 'Something else', occasion: 'other', promoted: false, line: 'Tell us what you have in mind.' },
];

export function finderEventType(value: string | undefined): FinderEventTypeDef | undefined {
  return FINDER_EVENT_TYPES.find((t) => t.value === value);
}
export function isFinderEventType(value: unknown): value is FinderEventType {
  return typeof value === 'string' && FINDER_EVENT_TYPES.some((t) => t.value === value);
}

export type Priority = 'food' | 'music' | 'talk' | 'skyline' | 'av' | 'logistics';

export const PRIORITIES: { value: Priority; label: string; need?: Need }[] = [
  { value: 'food', label: 'Great food and drinks', need: 'food' },
  { value: 'music', label: 'Live music', need: 'music' },
  { value: 'talk', label: 'Room to talk' },
  { value: 'skyline', label: 'Skyline or rooftop', need: 'outdoor' },
  { value: 'av', label: 'Presentations and AV', need: 'av' },
  { value: 'logistics', label: 'Easy group logistics' },
];
export const MAX_PRIORITIES = 3;

export function isPriority(value: unknown): value is Priority {
  return typeof value === 'string' && PRIORITIES.some((p) => p.value === value);
}
export function priorityLabel(value: Priority): string {
  return PRIORITIES.find((p) => p.value === value)?.label ?? value;
}
/** The brief's `needs` for a set of priorities (ranking input for venue-rank). */
export function prioritiesToNeeds(priorities: Priority[]): Need[] {
  const out: Need[] = [];
  for (const p of priorities) {
    const need = PRIORITIES.find((d) => d.value === p)?.need;
    if (need && !out.includes(need)) out.push(need);
  }
  return out;
}

/** "Open to the best fit" for the area input. */
export const ANY_AREA = 'any';

export interface FinderInput {
  eventType?: FinderEventType;
  /** A SIZE_BANDS slug. */
  size?: string;
  /** A neighborhood slug, or ANY_AREA. */
  area?: string;
  priorities: Priority[];
}

/** The venue facts the finder needs; a lean, serializable view of EventVenue. */
export interface FinderVenue {
  slug: string;
  name: string;
  kind: VenueKind;
  neighborhoodSlug: string;
  ownedByBph: boolean;
  verified: boolean;
  features: string[];
  spaces: EventSpace[];
}

export type Layout = 'seated' | 'standing' | 'mixed';

export interface SpaceMatch {
  venueSlug: string;
  venueName: string;
  venueKind: VenueKind;
  neighborhoodSlug: string;
  ownedByBph: boolean;
  verified: boolean;
  space: EventSpace;
  /** Fit score, 0 to 1; ownership, fee and sponsorship are not inputs. */
  score: number;
  inArea: boolean;
  /** Which of the chosen priorities the space meets on its own facts. */
  meets: Priority[];
}

export interface Recommendation {
  layout: Layout;
  format: { title: string; body: string };
  area: { slug?: string; name: string; body: string; listed: boolean; chosen: boolean };
  why: string[];
  considerations: string[];
  spaces: SpaceMatch[];
  needs: Need[];
}

/* ---------------------------------- URL ---------------------------------- */

type Params = Record<string, string | string[] | undefined>;
function one(params: Params, key: string): string | undefined {
  const raw = params[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.trim() || undefined;
}

export function parsePriorities(raw: string | string[] | undefined): Priority[] {
  const text = Array.isArray(raw) ? raw.join(',') : raw ?? '';
  const out: Priority[] = [];
  for (const part of text.split(',')) {
    const value = part.trim();
    if (isPriority(value) && !out.includes(value)) out.push(value);
    if (out.length === MAX_PRIORITIES) break;
  }
  return out;
}

/** Finder state from a URL: `event`, `size`, `area`, `pri=a,b,c`. Unknown values are dropped. */
export function readFinderParams(params: Params): FinderInput {
  const eventType = one(params, 'event');
  const size = one(params, 'size');
  const area = one(params, 'area');
  return {
    eventType: isFinderEventType(eventType) ? eventType : undefined,
    size: size && sizeBandBySlug(size) ? size : undefined,
    area: area === ANY_AREA || neighborhoods.some((n) => n.slug === area) ? area : undefined,
    priorities: parsePriorities(params.pri),
  };
}

/** The same state as query parameters, for links between the hub and the brief. */
export function finderParams(input: Partial<FinderInput>): URLSearchParams {
  const sp = new URLSearchParams();
  if (input.eventType) sp.set('event', input.eventType);
  if (input.size) sp.set('size', input.size);
  if (input.area) sp.set('area', input.area);
  if (input.priorities?.length) sp.set('pri', input.priorities.slice(0, MAX_PRIORITIES).join(','));
  return sp;
}

/* ------------------------------- Decisions ------------------------------- */

function sizeBand(input: FinderInput): SizeBand | undefined {
  return input.size ? sizeBandBySlug(input.size) : undefined;
}

export function chooseLayout(input: FinderInput): Layout {
  let seated = 0;
  let standing = 0;
  switch (input.eventType) {
    case 'corporate':
      seated += 1;
      break;
    case 'offsite':
    case 'rehearsal_dinner':
      seated += 2;
      break;
    case 'convention':
    case 'welcome_party':
      standing += 2;
      break;
    case 'holiday':
    case 'bachelorette':
      standing += 1;
      break;
    default:
      break;
  }
  for (const p of input.priorities) {
    if (p === 'talk') seated += 2;
    if (p === 'av' || p === 'food') seated += 1;
    if (p === 'music') standing += 2;
    if (p === 'skyline') standing += 1;
  }
  if (input.size === 'up-to-25') seated += 1;
  if (input.size === '75-200') standing += 1;
  if (input.size === '200-plus') standing += 2;
  if (seated === standing) return 'mixed';
  return seated > standing ? 'seated' : 'standing';
}

function formatFor(input: FinderInput, layout: Layout): { title: string; body: string } {
  const has = (p: Priority) => input.priorities.includes(p);
  const type = input.eventType;
  if (type === 'offsite') {
    return layout === 'standing'
      ? { title: 'Working session, then a standing reception', body: 'A private room set classroom or boardroom style for the session, then the same floor turned over to cocktail tables and stations. Keep the group in one place so nobody loses the thread.' }
      : { title: 'Working day with a seated lunch', body: 'A private room set classroom or boardroom style for the session, with one long table or rounds for lunch in the same room. Daylight and a breakout corner matter more than a stage.' };
  }
  if (layout === 'seated') {
    if (type === 'convention') return { title: 'Seated dinner off the show floor', body: 'Rounds or long tables with a full dinner service, a short walk from the convention hotels. Seated capacity is the number to check, not standing.' };
    if (type === 'rehearsal_dinner') return { title: 'Seated dinner', body: 'One long table or rounds, a set menu and room for toasts. Seated capacity is the number to check, not standing.' };
    return {
      title: has('av') ? 'Seated dinner with a short program' : 'Seated dinner',
      body: `Rounds or long tables with a full dinner service${has('av') ? ', screens and microphones ready for a program slot after the main course' : ''}. Seated capacity is the number to check, not standing${has('talk') ? ', and exclusive use of the room keeps the noise yours' : ''}.`,
    };
  }
  if (layout === 'standing') {
    if (type === 'convention') return { title: 'Standing welcome reception', body: 'Two to three hours, passed food and stations, bars open from the first guest. Standing capacity is the number that matters, and a short walk from the hotels keeps attendance up.' };
    if (has('music')) return { title: 'Standing reception with a live stage', body: 'Cocktail tables and a few seated pockets, a band or DJ on the venue’s own stage, food as stations or passed. Plan one quieter corner for the people who want to talk.' };
    if (type === 'holiday') return { title: 'Cocktail party with food stations', body: 'Standing room with stations and a few seated pockets, bars open all night, a short toast at most. Standing capacity is the number that matters.' };
    return { title: 'Cocktail reception', body: 'Standing room with passed food or stations and a few seated pockets. Standing capacity is the number that matters.' };
  }
  return { title: 'Reception with a seated core', body: 'Dinner seating for about half the room and standing space for the rest. It works when guests arrive in waves or when the program is short; compare both capacities when you look at rooms.' };
}

function travelLine(slug: string): string {
  const n = neighborhoods.find((x) => x.slug === slug);
  if (!n) return '';
  if (n.broadwayMinutes.walk === 0) return 'On Lower Broadway, with the convention hotels within walking distance.';
  if (n.broadwayMinutes.walk !== undefined) return `About ${n.broadwayMinutes.walk} minutes’ walk from Lower Broadway, ${n.broadwayMinutes.drive} by car.`;
  return `About ${n.broadwayMinutes.drive} minutes by car from downtown.`;
}

/** Score every neighborhood for the brief from the content rows, then pick the best. Deterministic; ties keep content order. */
export function suggestArea(input: FinderInput, venues: FinderVenue[]): { slug: string; reasons: string[] } {
  const has = (p: Priority) => input.priorities.includes(p);
  const listedIn = new Set(venues.filter((v) => v.spaces.some((s) => s.published)).map((v) => v.neighborhoodSlug));
  let best: { slug: string; score: number; reasons: string[] } | undefined;
  for (const n of neighborhoods) {
    let score = 0;
    const reasons: string[] = [];
    const walk = n.broadwayMinutes.walk;
    const knownFor = n.knownFor.join(' ').toLowerCase();
    if ((input.eventType === 'convention' || input.eventType === 'welcome_party') && walk !== undefined) {
      score += 3 - walk / 10;
      reasons.push('walkable from the convention hotels');
    }
    if (has('logistics')) {
      if (walk !== undefined) score += 2;
      if (/hotels/.test(knownFor)) {
        score += 1;
        reasons.push('hotels close by');
      }
    }
    if (has('talk')) {
      if (n.nightlifeLevel === 'Low' || n.nightlifeLevel === 'Moderate') {
        score += 2;
        reasons.push('quieter at night');
      }
    }
    if (has('food') && /restaurant/.test(knownFor)) {
      score += 2;
      reasons.push('known for its restaurants');
    }
    if (has('music') && /live music|honky/.test(knownFor)) {
      score += 2;
      reasons.push('live music on the block');
    }
    if (has('skyline') && walk === 0) {
      score += 2;
      reasons.push('the rooftops look straight down Broadway');
    }
    if (input.eventType === 'offsite' && (n.nightlifeLevel === 'Low' || n.nightlifeLevel === 'Moderate')) score += 1;
    if (n.bestFor.includes('Groups')) {
      score += 1;
      reasons.push('built for groups');
    }
    if (listedIn.has(n.slug)) {
      score += 1.5;
      reasons.push('has verified spaces listed here');
    }
    if (!best || score > best.score) best = { slug: n.slug, score, reasons };
  }
  return best ? { slug: best.slug, reasons: best.reasons } : { slug: neighborhoods[0].slug, reasons: [] };
}

/* ------------------------------ Space match ------------------------------ */

const FEATURE = (venue: FinderVenue, ...keys: string[]) => keys.some((k) => venue.features.includes(k));

/** Which chosen priorities a space meets on its own row and the venue's features. */
export function spaceMeets(venue: FinderVenue, space: EventSpace, priorities: Priority[]): Priority[] {
  const out: Priority[] = [];
  for (const p of priorities) {
    const met =
      p === 'music' ? venue.kind === 'music_venue' || FEATURE(venue, 'stage', 'house_sound') :
      p === 'skyline' ? space.outdoor || venue.kind === 'rooftop' || FEATURE(venue, 'rooftop') :
      p === 'av' ? space.avIncluded :
      p === 'logistics' ? space.privateEntrance || space.accessible || FEATURE(venue, 'parking', 'valet') :
      p === 'food' ? FEATURE(venue, 'in_house_catering', 'full_bar') :
      p === 'talk' ? space.privateEntrance || /exclusive|private dining|boardroom/i.test(space.name) :
      false;
    if (met) out.push(p);
  }
  return out;
}

const MISS = 0.75;
const OUT_OF_AREA = 0.7;

/**
 * Spaces that fit the brief, best first. A space must fit the size band on
 * the capacity the layout needs (seated for a dinner, standing for a
 * reception); each unmet priority and a venue outside the chosen area cost
 * a fixed factor, and rooms sized closest to the group win ties.
 */
export function matchSpaces(input: FinderInput, venues: FinderVenue[], layout: Layout, limit = 3): SpaceMatch[] {
  const band = sizeBand(input);
  const matches: Array<SpaceMatch & { surplus: number }> = [];
  for (const venue of venues) {
    for (const space of venue.spaces) {
      if (!space.published) continue;
      if (/TODO/.test(`${space.name} ${space.summary ?? ''} ${venue.name}`)) continue;
      const capacity = layout === 'seated' ? space.seatedCapacity : layout === 'standing' ? space.standingCapacity : Math.max(space.seatedCapacity, space.standingCapacity);
      if (capacity <= 0) continue;
      if (band) {
        if (!spaceFitsBand(space, band)) continue;
        if (capacity < band.min) continue;
      }
      const meets = spaceMeets(venue, space, input.priorities);
      const inArea = !input.area || input.area === ANY_AREA || venue.neighborhoodSlug === input.area;
      let score = 1;
      for (const p of input.priorities) if (!meets.includes(p)) score *= MISS;
      if (!inArea) score *= OUT_OF_AREA;
      const target = band ? (Number.isFinite(band.max) ? band.max : band.min) : capacity;
      matches.push({
        venueSlug: venue.slug,
        venueName: venue.name,
        venueKind: venue.kind,
        neighborhoodSlug: venue.neighborhoodSlug,
        ownedByBph: venue.ownedByBph,
        verified: venue.verified,
        space,
        score: Math.round(score * 1000) / 1000,
        inArea,
        meets,
        surplus: Math.max(0, capacity - target),
      });
    }
  }
  matches.sort((a, b) => b.score - a.score || a.surplus - b.surplus || a.space.slug.localeCompare(b.space.slug));
  return matches.slice(0, limit).map(({ surplus: _s, ...m }) => m);
}

/* ----------------------------- Recommendation ---------------------------- */

const SIZE_LINE: Record<string, string> = {
  'up-to-25': 'Up to 25 guests fits a private dining room or a reserved section; a whole floor would feel empty.',
  '25-75': '25 to 75 guests is the size most semi-private sections and small rooms are built for.',
  '75-200': '75 to 200 guests needs an exclusive floor or a full room; a reserved section will not hold it.',
  '200-plus': 'Over 200 guests means a full floor or a venue buyout, with its own minimum guest count.',
};

const PRIORITY_WHY: Record<Priority, string> = {
  food: 'Great food and drinks: rooms with in-house catering and a full bar rank first, and a seated service when the meal is the point.',
  music: 'Live music: venues with their own stage and house sound, so the band is part of the room rather than a rental.',
  talk: 'Room to talk: exclusive use or a separate floor beats a reserved corner of a loud room.',
  skyline: 'Skyline or rooftop: open-air decks and rooftop levels, with a weather plan built in.',
  av: 'Presentations and AV: spaces that include screens and sound, so a program does not need an outside crew.',
  logistics: 'Easy group logistics: a private entrance, step-free access and a short walk from the hotels.',
};

const PRIORITY_CONSIDERATION: Record<Priority, string> = {
  food: 'Menus and minimums: ask whether the food-and-drink minimum includes service charge and tax, and how far ahead the menu is set.',
  music: 'Live music: confirm the stage, house sound and the noise curfew, and keep one quieter area for conversation.',
  talk: 'Conversation: a semi-private section of a loud room rarely works for talking; ask for exclusive use or a separate floor, and a start before the house gets busy.',
  skyline: 'Weather backup: ask for a covered or indoor fallback on the same floor and the time of the rain call.',
  av: 'AV: confirm what is included (screens, microphones, a projector) and whether a technician is on site for the program.',
  logistics: 'Transportation: a venue within walking distance of your hotels avoids a shuttle; otherwise budget for buses and a staggered arrival.',
};

export function recommend(input: FinderInput, venues: FinderVenue[]): Recommendation {
  const layout = chooseLayout(input);
  const format = formatFor(input, layout);
  const type = finderEventType(input.eventType);
  const band = sizeBand(input);
  const listed = venues.filter((v) => v.spaces.some((s) => s.published));

  // Area: the planner's choice, or the content rows' best fit.
  const chosen = Boolean(input.area && input.area !== ANY_AREA);
  const areaSlug = chosen ? (input.area as string) : suggestArea(input, listed).slug;
  const areaRow = neighborhoods.find((n) => n.slug === areaSlug);
  const areaListed = listed.some((v) => v.neighborhoodSlug === areaSlug);
  const areaReasons = chosen ? [] : suggestArea(input, listed).reasons;
  const area = {
    slug: areaSlug,
    name: areaRow?.name ?? 'Nashville',
    body: areaRow ? `${areaRow.summary} ${travelLine(areaSlug)}`.trim() : '',
    listed: areaListed,
    chosen,
  };

  const why: string[] = [];
  if (type) why.push(`${type.label}: ${type.line}`);
  if (band) why.push(SIZE_LINE[band.slug] ?? '');
  why.push(`${layout === 'seated' ? 'Seated' : layout === 'standing' ? 'Standing' : 'Seated and standing'} layout: ${layout === 'seated' ? 'your event type and priorities point to a meal at tables' : layout === 'standing' ? 'your event type and priorities point to a reception people move through' : 'the inputs split evenly, so compare both capacities'}.`);
  if (chosen) why.push(`${area.name}: your choice, so spaces there come first${areaListed ? '' : ', though none is listed there yet'}.`);
  else why.push(`${area.name}: suggested because it is ${areaReasons.length ? areaReasons.slice(0, 3).join(', ') : 'the best fit of the areas we cover'}.`);
  for (const p of input.priorities) why.push(PRIORITY_WHY[p]);

  const considerations: string[] = [];
  for (const p of input.priorities) considerations.push(PRIORITY_CONSIDERATION[p]);
  if (input.eventType === 'convention') considerations.push('Convention timing: start after the show floor closes and keep the venue within a short walk or one shuttle loop of the convention center.');
  if (input.eventType === 'holiday') considerations.push('December dates: Thursday and Friday evenings go first; name a backup date in your brief.');
  if (input.eventType === 'offsite') considerations.push('A working day needs breakout room, daylight if you can get it, and a lunch plan that does not clear the room.');
  if (band?.slug === '200-plus') considerations.push('At this size you are looking at a full floor or a buyout; read the minimum guest count and the food-and-drink minimum together.');
  if (layout === 'seated') considerations.push('Seated capacity is often half the standing number; compare rooms on the seated figure.');
  if (!input.priorities.includes('logistics') && (input.eventType === 'convention' || band?.slug === '200-plus')) considerations.push('Transportation: a venue within walking distance of your hotels avoids a shuttle; otherwise budget for buses and a staggered arrival.');

  return {
    layout,
    format,
    area,
    why: why.filter(Boolean),
    considerations: considerations.slice(0, 5),
    spaces: matchSpaces(input, listed, layout),
    needs: prioritiesToNeeds(input.priorities),
  };
}

/** Group-size options in the finder: the browse bands, in order. */
export const GROUP_SIZES = SIZE_BANDS;
