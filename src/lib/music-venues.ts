import type { LiveEvent } from '@/lib/feeds/ticketmaster';
import type { DataStatus, Venue } from '@/lib/types';
import type { ImageKey } from '@/lib/media';
import { getVenue } from '@/lib/content/listings';

export type MusicVenueGroupId =
  | 'nashville-icons'
  | 'major-stages'
  | 'listening-rooms';

export interface MusicVenueGroup {
  id: MusicVenueGroupId;
  title: string;
  description: string;
}

export interface MusicVenueEntry {
  slug: string;
  name: string;
  area: string;
  format: string;
  group: MusicVenueGroupId;
  summary: string;
  whyWeRecommend: string;
  capacityNote: string;
  coverNote: string;
  address: string;
  mapQuery: string;
  genres: string[];
  ticketmasterAliases: string[];
  relatedSlugs: string[];
  dateChecked: string;
  dataStatus: DataStatus;
  active: boolean;
  openingNote?: string;
  tourQuery?: string;
  imageKey?: ImageKey;
  editorial?: Venue;
}

type MusicVenueSeed = Omit<
  MusicVenueEntry,
  | 'editorial'
  | 'name'
  | 'summary'
  | 'whyWeRecommend'
  | 'capacityNote'
  | 'coverNote'
  | 'address'
  | 'mapQuery'
  | 'genres'
  | 'dateChecked'
  | 'dataStatus'
> & {
  editorialSlug?: string;
  name: string;
  summary: string;
  whyWeRecommend: string;
  capacityNote: string;
  coverNote: string;
  address: string;
  mapQuery: string;
  genres: string[];
  dateChecked: string;
  dataStatus: DataStatus;
};

export const musicVenueGroups: MusicVenueGroup[] = [
  {
    id: 'nashville-icons',
    title: 'Nashville icons',
    description:
      'The two rooms most visitors build a music trip around: one downtown and one at the Opry campus.',
  },
  {
    id: 'major-stages',
    title: 'Major concert stages',
    description:
      'Arena, amphitheater, and modern concert-hall dates with national touring acts and reserved tickets.',
  },
  {
    id: 'listening-rooms',
    title: 'Listening rooms & clubs',
    description:
      'Smaller rooms where the songwriter, band, and sound matter more than production scale.',
  },
];

function hydrateVenue(seed: MusicVenueSeed): MusicVenueEntry {
  const { editorialSlug, ...fallback } = seed;
  const editorial = editorialSlug ? getVenue(editorialSlug) : undefined;

  return {
    ...fallback,
    name: editorial?.title ?? fallback.name,
    summary: editorial?.summary ?? fallback.summary,
    whyWeRecommend: editorial?.whyWeRecommend ?? fallback.whyWeRecommend,
    capacityNote: editorial?.capacityNote ?? fallback.capacityNote,
    coverNote: editorial?.coverNote ?? fallback.coverNote,
    address: editorial?.address ?? fallback.address,
    mapQuery: editorial?.mapQuery ?? fallback.mapQuery,
    genres: editorial?.genres?.length ? editorial.genres : fallback.genres,
    dateChecked: editorial?.dateChecked ?? fallback.dateChecked,
    dataStatus: editorial?.dataStatus ?? fallback.dataStatus,
    editorial,
  };
}

const seeds: MusicVenueSeed[] = [
  {
    editorialSlug: 'ryman-auditorium',
    slug: 'ryman-auditorium',
    name: 'Ryman Auditorium',
    area: 'Downtown',
    format: 'Historic theater',
    group: 'nashville-icons',
    summary:
      'Nashville’s landmark downtown listening room, known for clear acoustics, wooden pews, and a calendar that ranges well beyond country music.',
    whyWeRecommend:
      'The Ryman is the room to prioritize when the artist matters. It is intimate enough to feel connected to the stage but large enough to attract major touring acts.',
    capacityNote: 'About 2,300 seats',
    coverNote: 'Advance ticket required for most shows',
    address: '116 Rep. John Lewis Way N, Nashville, TN 37219',
    mapQuery: 'Ryman Auditorium, Nashville, TN',
    genres: ['Country', 'Americana', 'Rock', 'Comedy'],
    ticketmasterAliases: ['Ryman Auditorium'],
    relatedSlugs: ['grand-ole-opry', 'bridgestone-arena', 'bluebird-cafe'],
    dateChecked: '2026-08-19',
    dataStatus: 'verified',
    active: true,
    tourQuery: 'Ryman Auditorium tour',
  },
  {
    slug: 'grand-ole-opry',
    name: 'Grand Ole Opry',
    area: 'Music Valley',
    format: 'Opry show & concert hall',
    group: 'nashville-icons',
    summary:
      'The long-running live Opry show at the Grand Ole Opry House, built around a rotating lineup of country artists, legends, and newcomers.',
    whyWeRecommend:
      'Choose the Opry for the institution rather than one headliner. A typical show moves through multiple artists and generations in a single evening.',
    capacityNote: '4,372 seats',
    coverNote: 'Reserved ticket required',
    address: '600 Opry Mills Dr, Nashville, TN 37214',
    mapQuery: 'Grand Ole Opry House, Nashville, TN',
    genres: ['Country', 'Bluegrass', 'Americana'],
    ticketmasterAliases: [
      'Grand Ole Opry House',
      'Grand Ole Opry',
      'Opry House',
      'Opry House - Nashville',
    ],
    relatedSlugs: ['ryman-auditorium', 'bluebird-cafe', 'station-inn'],
    dateChecked: '2026-08-19',
    dataStatus: 'verified',
    active: true,
    imageKey: 'editorial/grand-ole-opry-house',
  },
  {
    editorialSlug: 'bridgestone-arena',
    slug: 'bridgestone-arena',
    name: 'Bridgestone Arena',
    area: 'Downtown',
    format: 'Arena',
    group: 'major-stages',
    summary:
      'Nashville’s downtown arena for the largest touring concerts, major events, and Nashville Predators games.',
    whyWeRecommend:
      'It is the easiest large venue to pair with a Broadway night because the front doors sit directly at the top of the strip.',
    capacityNote: 'Arena scale; configuration varies',
    coverNote: 'Reserved or general-admission ticket, depending on show',
    address: '501 Broadway, Nashville, TN 37203',
    mapQuery: 'Bridgestone Arena, Nashville, TN',
    genres: ['Pop', 'Country', 'Rock', 'Hip-hop'],
    ticketmasterAliases: ['Bridgestone Arena'],
    relatedSlugs: ['ryman-auditorium', 'ascend-amphitheater', 'the-pinnacle'],
    dateChecked: '2026-08-19',
    dataStatus: 'verified',
    active: true,
  },
  {
    editorialSlug: 'ascend-amphitheater',
    slug: 'ascend-amphitheater',
    name: 'Ascend Amphitheater',
    area: 'Riverfront',
    format: 'Outdoor amphitheater',
    group: 'major-stages',
    summary:
      'A seasonal riverfront amphitheater with reserved seating near the stage and a lawn behind it.',
    whyWeRecommend:
      'Ascend combines a true touring-show setup with a downtown location. It works especially well when the weather cooperates and the skyline becomes part of the show.',
    capacityNote: 'About 6,800 across seats and lawn',
    coverNote: 'Ticket required; reserved and lawn sections vary by show',
    address: '310 1st Ave S, Nashville, TN 37201',
    mapQuery: 'Ascend Amphitheater, Nashville, TN',
    genres: ['Rock', 'Country', 'Alternative', 'Pop'],
    ticketmasterAliases: ['Ascend Amphitheater'],
    relatedSlugs: ['bridgestone-arena', 'ryman-auditorium', 'the-pinnacle'],
    dateChecked: '2026-08-19',
    dataStatus: 'verified',
    active: true,
  },
  {
    editorialSlug: 'the-pinnacle',
    slug: 'the-pinnacle',
    name: 'The Pinnacle',
    area: 'Nashville Yards',
    format: 'Concert hall',
    group: 'major-stages',
    summary:
      'A modern indoor concert hall at Nashville Yards designed for touring acts that sit between club and arena scale.',
    whyWeRecommend:
      'The Pinnacle fills an important middle ground: bigger production than a club, but a more focused experience than an arena.',
    capacityNote: 'About 4,500',
    coverNote: 'Advance ticket required',
    address: '910 Exchange Ln, Nashville, TN 37203',
    mapQuery: 'The Pinnacle at Nashville Yards, Nashville, TN',
    genres: ['Rock', 'Pop', 'Hip-hop', 'Electronic'],
    ticketmasterAliases: [
      'The Pinnacle at Nashville Yards',
      'Pinnacle at Nashville Yards',
      'The Pinnacle Nashville Yards',
      'The Pinnacle',
    ],
    relatedSlugs: ['bridgestone-arena', 'ryman-auditorium', 'ascend-amphitheater'],
    dateChecked: '2026-08-19',
    dataStatus: 'verified',
    active: true,
  },
  {
    editorialSlug: 'the-truth',
    slug: 'the-truth',
    name: 'The Truth',
    area: 'Wedgewood-Houston',
    format: 'Concert hall',
    group: 'major-stages',
    summary:
      'Opening fall 2026, The Truth is a three-level Wedgewood-Houston concert hall with flexible seated and standing-room configurations.',
    whyWeRecommend:
      'The Truth brings a major touring room to Wedgewood-Houston while keeping the audience closer to the stage than an arena. Its announced opening calendar makes it useful to plan now, even before the doors open.',
    capacityNote: 'Up to 4,400 across three levels',
    coverNote: 'Advance ticket required; opening fall 2026',
    address: '440 Chestnut Street, Nashville, TN 37203',
    mapQuery: 'The Truth Nashville, 440 Chestnut Street, Nashville, TN',
    genres: ['Rock', 'Country', 'Pop', 'Hip-hop', 'Electronic', 'Comedy'],
    ticketmasterAliases: [
      'The Truth',
      'The Truth Nashville',
      'The Truth - Nashville',
    ],
    relatedSlugs: ['the-pinnacle', 'ascend-amphitheater', 'bridgestone-arena'],
    dateChecked: '2026-08-19',
    dataStatus: 'verified',
    active: true,
    openingNote: 'Opening fall 2026',
  },
  {
    editorialSlug: 'bluebird-cafe',
    slug: 'bluebird-cafe',
    name: 'The Bluebird Cafe',
    area: 'Green Hills',
    format: 'Songwriter listening room',
    group: 'listening-rooms',
    summary:
      'A tiny songwriter room where the stories behind the songs are as important as the songs themselves.',
    whyWeRecommend:
      'This is the classic in-the-round Nashville experience. The room is quiet, close, and difficult to replicate anywhere else.',
    capacityNote: 'About 90 seats',
    coverNote: 'Reservation or advance ticket usually required',
    address: '4104 Hillsboro Pike, Nashville, TN 37215',
    mapQuery: 'The Bluebird Cafe, Nashville, TN',
    genres: ['Songwriters', 'Country', 'Americana'],
    ticketmasterAliases: ['The Bluebird Cafe', 'Bluebird Cafe'],
    relatedSlugs: ['the-listening-room-cafe', 'station-inn', 'ryman-auditorium'],
    dateChecked: '2026-08-19',
    dataStatus: 'verified',
    active: true,
  },
  {
    slug: 'the-listening-room-cafe',
    name: 'The Listening Room Cafe',
    area: 'SoBro',
    format: 'Songwriter listening room & restaurant',
    group: 'listening-rooms',
    summary:
      'A songwriter-focused listening room and full-service restaurant where hit writers perform the songs—and tell the stories—behind them.',
    whyWeRecommend:
      'The Listening Room delivers the behind-the-song format in a larger, easier-to-book setting than the smallest songwriter rooms. It is a strong choice for dinner, groups, and visitors who still want the room to stay focused on the music.',
    capacityNote: 'About 255 seated; up to 450 standing for select configurations',
    coverNote: 'Most shows ticket through the venue; a food and beverage minimum may apply',
    address: '618 4th Ave S, Nashville, TN 37210',
    mapQuery: 'The Listening Room Cafe, 618 4th Ave S, Nashville, TN',
    genres: ['Songwriters', 'Country', 'Americana', 'Acoustic'],
    ticketmasterAliases: [
      'The Listening Room Cafe',
      'The Listening Room',
      'Listening Room Cafe',
    ],
    relatedSlugs: ['bluebird-cafe', '3rd-and-lindsley', 'station-inn'],
    dateChecked: '2026-08-19',
    dataStatus: 'verified',
    active: true,
  },
  {
    editorialSlug: 'station-inn',
    slug: 'station-inn',
    name: 'The Station Inn',
    area: 'The Gulch',
    format: 'Bluegrass listening room',
    group: 'listening-rooms',
    summary:
      'A no-frills listening room in The Gulch with a deep bluegrass calendar and decades of Nashville history.',
    whyWeRecommend:
      'The Station Inn feels like a music room first and a tourist attraction second. Go for bluegrass, arrive early, and keep the evening simple.',
    capacityNote: 'Small listening room',
    coverNote: 'Advance ticket or door cover, depending on show',
    address: '402 12th Ave S, Nashville, TN 37203',
    mapQuery: 'The Station Inn, Nashville, TN',
    genres: ['Bluegrass', 'Americana', 'Roots'],
    ticketmasterAliases: ['The Station Inn', 'Station Inn'],
    relatedSlugs: ['bluebird-cafe', 'the-listening-room-cafe', '3rd-and-lindsley'],
    dateChecked: '2026-08-19',
    dataStatus: 'verified',
    active: true,
  },
  {
    slug: '3rd-and-lindsley',
    name: '3rd & Lindsley',
    area: 'SoBro',
    format: 'Seated club',
    group: 'listening-rooms',
    summary:
      'A long-running Nashville club with strong sightlines, table seating, and a broad calendar of local and touring acts.',
    whyWeRecommend:
      'It is one of the easiest small rooms for visitors to navigate: serious music, a comfortable setup, and a location close to downtown without the Broadway intensity.',
    capacityNote: 'Up to 700; seating varies by show',
    coverNote: 'Advance ticket recommended',
    address: '818 3rd Ave S, Nashville, TN 37210',
    mapQuery: '3rd and Lindsley, Nashville, TN',
    genres: ['Americana', 'Rock', 'Country', 'Songwriters'],
    ticketmasterAliases: [
      '3rd & Lindsley',
      '3rd and Lindsley',
      '3rd & Lindsley Bar & Grill',
      '3rd and Lindsley Bar and Grill',
    ],
    relatedSlugs: ['the-listening-room-cafe', 'station-inn', 'the-basement-east'],
    dateChecked: '2026-08-19',
    dataStatus: 'verified',
    active: true,
  },
  {
    slug: 'the-basement-east',
    name: 'The Basement East',
    area: 'East Nashville',
    format: 'Standing-room club',
    group: 'listening-rooms',
    summary:
      'An East Nashville club—widely known as The Beast—with a busy calendar spanning indie rock, Americana, country, and heavier touring acts.',
    whyWeRecommend:
      'The Basement East is a strong choice when the goal is a real club show and an East Nashville night rather than a downtown itinerary.',
    capacityNote: 'Mid-size club; setup varies by show',
    coverNote: 'Advance ticket recommended',
    address: '917 Woodland St, Nashville, TN 37206',
    mapQuery: 'The Basement East, Nashville, TN',
    genres: ['Indie', 'Rock', 'Americana', 'Country'],
    ticketmasterAliases: ['The Basement East', 'Basement East'],
    relatedSlugs: ['exit-in', '3rd-and-lindsley', 'station-inn'],
    dateChecked: '2026-08-19',
    dataStatus: 'verified',
    active: true,
  },
  {
    slug: 'exit-in',
    name: 'EXIT/IN',
    area: 'Elliston Place',
    format: 'Rock club',
    group: 'listening-rooms',
    summary:
      'A historic Elliston Place rock club with a standing-room setup and a calendar built around emerging and established touring acts.',
    whyWeRecommend:
      'EXIT/IN is the pick for a straightforward club night near Midtown: compact, loud, and focused on the band rather than the room.',
    capacityNote: 'Club scale; mostly standing room',
    coverNote: 'Advance ticket recommended',
    address: '2208 Elliston Pl, Nashville, TN 37203',
    mapQuery: 'EXIT IN Nashville, TN',
    genres: ['Rock', 'Alternative', 'Indie', 'Punk'],
    ticketmasterAliases: ['EXIT/IN', 'Exit/In', 'EXIT IN', 'Exit In'],
    relatedSlugs: ['the-basement-east', '3rd-and-lindsley', 'the-pinnacle'],
    dateChecked: '2026-08-19',
    dataStatus: 'verified',
    active: true,
  },
];

export const musicVenues: MusicVenueEntry[] = seeds.map(hydrateVenue);

export function getMusicVenue(slug: string): MusicVenueEntry | undefined {
  return musicVenues.find((venue) => venue.slug === slug);
}

export function getMusicVenueGroup(id: MusicVenueGroupId): MusicVenueGroup {
  return musicVenueGroups.find((group) => group.id === id) ?? musicVenueGroups[0];
}

export function normalizeTicketmasterVenue(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[’']/g, '')
    .replace(/\b(?:nashville|tennessee|tn)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function aliasSet(venue: MusicVenueEntry): Set<string> {
  return new Set(
    [venue.name, ...venue.ticketmasterAliases]
      .map(normalizeTicketmasterVenue)
      .filter(Boolean),
  );
}

export function eventBelongsToMusicVenue(
  event: Pick<LiveEvent, 'venue'>,
  venue: MusicVenueEntry,
): boolean {
  const normalized = normalizeTicketmasterVenue(event.venue);
  if (!normalized) return false;
  return aliasSet(venue).has(normalized);
}

function normalizeEventTitle(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function eventKey(event: LiveEvent): string {
  const semanticKey = [
    normalizeTicketmasterVenue(event.venue),
    event.date,
    event.time || '',
    normalizeEventTitle(event.name),
  ].join('|');

  return semanticKey.replace(/\|/g, '')
    ? semanticKey
    : `${event.source}:${event.id}`;
}

export function sortLiveEvents(events: LiveEvent[]): LiveEvent[] {
  return [...events].sort((a, b) => {
    const byDate = a.date.localeCompare(b.date);
    if (byDate !== 0) return byDate;
    return (a.time || '23:59').localeCompare(b.time || '23:59');
  });
}

export function eventsForMusicVenue(
  events: LiveEvent[],
  venue: MusicVenueEntry,
): LiveEvent[] {
  const seen = new Set<string>();
  const matched = events.filter((event) => {
    if (!eventBelongsToMusicVenue(event, venue)) return false;
    const key = eventKey(event);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return sortLiveEvents(matched);
}

export function buildMusicVenueEventMap(
  events: LiveEvent[],
): Map<string, LiveEvent[]> {
  return new Map(
    musicVenues.map((venue) => [venue.slug, eventsForMusicVenue(events, venue)]),
  );
}

export interface MatchedMusicVenueEvent {
  venue: MusicVenueEntry;
  event: LiveEvent;
}

export function matchedMusicVenueEvents(
  eventMap: Map<string, LiveEvent[]>,
): MatchedMusicVenueEvent[] {
  const seen = new Set<string>();
  const rows: MatchedMusicVenueEvent[] = [];

  for (const venue of musicVenues) {
    for (const event of eventMap.get(venue.slug) ?? []) {
      const key = eventKey(event);
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ venue, event });
    }
  }

  return rows.sort((a, b) => {
    const byDate = a.event.date.localeCompare(b.event.date);
    if (byDate !== 0) return byDate;
    return (a.event.time || '23:59').localeCompare(b.event.time || '23:59');
  });
}
