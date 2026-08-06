/**
 * Media system.
 *
 * Real photography and video are referenced here by a stable key. Components
 * never hardcode a path. Drop the licensed files into `public/media/` using the
 * filenames below and every surface that uses the key picks them up.
 *
 * Until a file exists, `SmartImage` renders a typographic fallback rather than
 * a broken image or a stock photo that misrepresents a specific business.
 * See `public/media/README.md` and `docs/media/MEDIA-MAP.md`.
 */

export interface MediaAsset {
  /** Path under /public. */
  src: string;
  /** Required alt text. Describes the photo, not the page. */
  alt: string;
  /** Photographer or agency. Displayed where the licence requires it. */
  credit?: string;
  /** Licence note kept for the record, e.g. "Unsplash Licence", "Licensed 2026". */
  licence?: string;
  /** Intrinsic size, used to reserve layout space and avoid CLS. */
  width: number;
  height: number;
  /** Tiny blurred placeholder (data URI) if one has been generated. */
  blurDataURL?: string;
  /** Focal point for art direction on tight crops. */
  focal?: 'center' | 'top' | 'bottom';
  /** Optional mobile/portrait crop for <picture> heroes. */
  srcMobile?: string;
  /** CSS object-position for desktop. */
  objectPosition?: string;
  /** CSS object-position for mobile crop. */
  objectPositionMobile?: string;
}

/**
 * Hero video. A short, muted, looping clip. Keep it under ~4 MB and provide
 * both formats; browsers pick the first they can play.
 */
export interface VideoAsset {
  webm?: string;
  mp4?: string;
  /** Still frame shown before the video loads, and to anyone who prefers reduced motion. */
  poster?: string;
  alt: string;
  credit?: string;
  licence?: string;
}

export const heroVideo: VideoAsset = {
  webm: '/media/hero/nashville-hero.webm',
  mp4: '/media/hero/nashville-hero.mp4',
  poster: '/media/hero/nashville-hero-poster.jpg',
  alt: 'Skyline view of a downtown Nashville street scene.',
  licence: 'Pexels License',
};

export const images = {
  'editorial/broadway-nightlife': {
    src: '/media/editorial/broadway-nightlife.jpg',
    alt: 'A crowded Nashville rooftop after dark.',
    licence: 'BPH-owned media — user-authorized reuse on 2026-08-04',
    width: 1600,
    height: 1067,
  },
  'editorial/broadway-rooftop-day': {
    src: '/media/editorial/broadway-rooftop-day.jpg',
    alt: 'Daytime rooftop seating overlooking Lower Broadway and downtown Nashville.',
    licence: 'BPH-owned media — user-authorized reuse on 2026-08-04',
    width: 1600,
    height: 1067,
  },
  'editorial/cocktail-service': {
    src: '/media/editorial/cocktail-service.jpg',
    alt: 'A bartender preparing a drink at a Nashville bar.',
    licence: 'BPH-owned media — user-authorized reuse on 2026-08-04',
    width: 1600,
    height: 1067,
  },
  'editorial/grand-ole-opry-house': {
    src: '/media/editorial/grand-ole-opry-house.jpg',
    alt: 'The Grand Ole Opry House entrance and plaza.',
    credit: 'Antony-22 / Wikimedia Commons',
    licence: 'CC BY-SA 4.0',
    width: 1600,
    height: 1067,
  },
  'editorial/live-music-crowd': {
    src: '/media/editorial/live-music-crowd.jpg',
    alt: 'A downtown Nashville crowd facing a rooftop stage.',
    licence: 'BPH-owned media — user-authorized reuse on 2026-08-04',
    width: 1600,
    height: 1067,
  },
  'editorial/live-performance-overhead': {
    src: '/media/editorial/live-performance-overhead.jpg',
    alt: 'A large audience gathered for a live performance at a Nashville venue.',
    licence: 'BPH-owned media — user-authorized reuse on 2026-08-04',
    width: 1600,
    height: 1067,
  },
  'editorial/music-row-studio-b': {
    src: '/media/editorial/music-row-studio-b.jpg',
    alt: 'RCA Studio B on Music Row.',
    credit: 'Cliff / Wikimedia Commons',
    licence: 'CC BY 2.0',
    width: 1600,
    height: 1067,
  },
  'editorial/nashville-food': {
    src: '/media/editorial/nashville-food.jpg',
    alt: 'Several plated dishes arranged on a restaurant table.',
    licence: 'BPH-owned media — user-authorized reuse on 2026-08-04',
    width: 1600,
    height: 1067,
  },
  'editorial/opryland-atrium': {
    src: '/media/editorial/opryland-atrium.jpg',
    alt: 'The Cascades Atrium at Gaylord Opryland Resort.',
    credit: 'Antony-22 / Wikimedia Commons',
    licence: 'CC BY-SA 4.0',
    width: 1600,
    height: 1067,
  },
  'editorial/parthenon-west-end': {
    src: '/media/editorial/parthenon-west-end.jpg',
    alt: 'The Parthenon in Centennial Park under a blue sky.',
    credit: 'Warren LeMay / Wikimedia Commons',
    licence: 'CC BY-SA 2.0',
    width: 1600,
    height: 1067,
  },
  'editorial/private-events': {
    src: '/media/editorial/private-events.jpg',
    alt: 'A Nashville event room prepared for a private gathering.',
    licence: 'BPH-owned media — user-authorized reuse on 2026-08-04',
    width: 1600,
    height: 1067,
  },
  'editorial/printers-alley': {
    src: '/media/editorial/printers-alley.jpg',
    alt: 'Urban alleyway with iconic blues bar signs in Nashville.',
    credit: 'Tatiana Bidon / Pexels',
    licence: 'Pexels License',
    width: 1600,
    height: 1067,
  },
  'editorial/rooftop-party': {
    src: '/media/editorial/rooftop-party.jpg',
    alt: 'Guests gathered at a rooftop party in Nashville.',
    licence: 'BPH-owned media — user-authorized reuse on 2026-08-04',
    width: 1600,
    height: 1067,
  },
  'editorial/the-lanes-community-center': {
    src: '/media/editorial/the-lanes-community-center.jpg',
    alt: 'Interior of a Nashville community center with lounge and gathering space.',
    licence: 'BPH-owned media — user-authorized reuse on 2026-08-04',
    width: 1600,
    height: 1067,
  },
  'editorial/the-lanes-greenway': {
    src: '/media/editorial/the-lanes-greenway.jpg',
    alt: 'A pedestrian bridge along a greenway in North Nashville.',
    licence: 'BPH-owned media — user-authorized reuse on 2026-08-04',
    width: 1600,
    height: 1067,
  },
  'editorial/the-lanes-homes': {
    src: '/media/editorial/the-lanes-homes.jpg',
    alt: 'New single-family homes along a landscaped Nashville street.',
    licence: 'BPH-owned media — user-authorized reuse on 2026-08-04',
    width: 1600,
    height: 1067,
  },
  'editorial/the-lanes-outdoor-living': {
    src: '/media/editorial/the-lanes-outdoor-living.jpg',
    alt: 'Landscaped pool and gathering spaces with the Nashville skyline in the distance.',
    licence: 'BPH-owned media — user-authorized reuse on 2026-08-04',
    width: 1600,
    height: 1067,
  },
  'editorial/the-lanes-pool': {
    src: '/media/editorial/the-lanes-pool.jpg',
    alt: 'Resort-style pool and landscaped deck in Nashville.',
    licence: 'BPH-owned media — user-authorized reuse on 2026-08-04',
    width: 1600,
    height: 1067,
  },
  'editorial/the-lanes-runner-dog': {
    src: '/media/editorial/the-lanes-runner-dog.jpg',
    alt: 'A person running with a dog in a Nashville residential community.',
    licence: 'BPH-owned media — user-authorized reuse on 2026-08-04',
    width: 1600,
    height: 1067,
  },
  'editorial/weho-fitness': {
    src: '/media/editorial/weho-fitness.jpg',
    alt: 'Modern fitness room at DELUX WeHo in Nashville.',
    licence: 'BPH-owned media — user-authorized reuse on 2026-08-04',
    width: 1600,
    height: 1067,
  },
  'editorial/weho-interior-design': {
    src: '/media/editorial/weho-interior-design.jpg',
    alt: 'Modern furnished residential interior at DELUX WeHo.',
    licence: 'BPH-owned media — user-authorized reuse on 2026-08-04',
    width: 1600,
    height: 1067,
  },
  'editorial/weho-lounge': {
    src: '/media/editorial/weho-lounge.jpg',
    alt: 'Bright lounge seating at DELUX WeHo.',
    licence: 'BPH-owned media — user-authorized reuse on 2026-08-04',
    width: 1600,
    height: 1067,
  },
  'editorial/weho-pool': {
    src: '/media/editorial/weho-pool.jpg',
    alt: 'Aerial view of a landscaped pool courtyard at DELUX WeHo.',
    licence: 'BPH-owned media — user-authorized reuse on 2026-08-04',
    width: 1600,
    height: 1067,
  },
  'editorial/weho-sauna': {
    src: '/media/editorial/weho-sauna.jpg',
    alt: 'Empty wood-lined sauna at DELUX WeHo.',
    licence: 'BPH-owned media — user-authorized reuse on 2026-08-04',
    width: 1600,
    height: 1067,
  },
  'editorial/weho-skyline': {
    src: '/media/editorial/weho-skyline.jpg',
    alt: 'Golden-hour view over Wedgewood-Houston toward downtown Nashville.',
    licence: 'BPH-owned media — user-authorized reuse on 2026-08-04',
    width: 1600,
    height: 1067,
  },
  'editorial/skyline': {
    src: '/media/editorial/skyline.jpg',
    alt: 'View of Nashville at sunset.',
    credit: 'Shane / Pexels',
    licence: 'Pexels License',
    width: 1600,
    height: 1067,
  },
  'hero/downtown-rooftop': {
    src: '/media/hero/downtown-rooftop.jpg',
    alt: 'Skyline view of a downtown Nashville street scene.',
    credit: 'Tatiana Bidon / Pexels',
    licence: 'Pexels License',
    width: 2400,
    height: 1350,
  },
  'hero/live-music-night': {
    src: '/media/hero/live-music-night.jpg',
    alt: 'Downtown Nashville at dusk.',
    credit: 'Ceesz / Pexels',
    licence: 'Pexels License',
    width: 2400,
    height: 1350,
  },
  'hero/lower-broadway': {
    src: '/media/hero/nashville-hero-poster.jpg',
    alt: 'Skyline view of a downtown Nashville street scene.',
    credit: 'Tatiana Bidon / Pexels',
    licence: 'Pexels License',
    width: 2400,
    height: 1350,
  },
  'hub/bachelorette': {
    src: '/media/hubs/bachelorette.jpg',
    alt: 'A lively rooftop party in downtown Nashville at night.',
    licence: 'BPH-owned media — user-authorized reuse on 2026-08-04',
    width: 1600,
    height: 1067,
  },
  'hub/honky-tonk-highway': {
    src: '/media/hubs/honky-tonk-highway.jpg',
    alt: 'Vibrant nightlife on Nashville Broadway at night.',
    credit: 'Shea Gordon / Pexels',
    licence: 'Pexels License',
    width: 1600,
    height: 1067,
  },
  'hub/hotels': {
    src: '/media/hubs/hotels.jpg',
    alt: 'The Cascades Atrium inside Gaylord Opryland Resort in Nashville.',
    credit: 'Antony-22 / Wikimedia Commons',
    licence: 'CC BY-SA 4.0',
    width: 1600,
    height: 1067,
  },
  'hub/live-music': {
    src: '/media/hubs/live-music.jpg',
    alt: 'People gathered in front of a Nashville building for live music.',
    credit: 'Rachel Claire / Pexels',
    licence: 'Pexels License',
    width: 1600,
    height: 1067,
  },
  'hub/opryland': {
    src: '/media/hubs/opryland.jpg',
    alt: 'The Cascades Atrium at Gaylord Opryland Resort.',
    credit: 'Antony-22 / Wikimedia Commons',
    licence: 'CC BY-SA 4.0',
    width: 1600,
    height: 1067,
  },
  'hub/outdoor-living': {
    src: '/media/hubs/outdoor-living.jpg',
    alt: 'Landscaped community green space and pool with the Nashville skyline beyond.',
    licence: 'BPH-owned media — user-authorized reuse on 2026-08-04',
    width: 1600,
    height: 1067,
  },
  'hub/pool': {
    src: '/media/hubs/pool.jpg',
    alt: 'A landscaped outdoor pool and courtyard at a Nashville residential property.',
    licence: 'BPH-owned media — user-authorized reuse on 2026-08-04',
    width: 1600,
    height: 1067,
  },
  'hub/restaurants': {
    src: '/media/hubs/restaurants.jpg',
    alt: 'A table of plated food at a Nashville restaurant.',
    licence: 'BPH-owned media — user-authorized reuse on 2026-08-04',
    width: 1600,
    height: 1067,
  },
  'hub/tickets': {
    src: '/media/hubs/tickets.jpg',
    alt: 'Vibrant evening scene in downtown Nashville.',
    credit: 'Mark Direen / Pexels',
    licence: 'Pexels License',
    width: 1600,
    height: 1067,
  },
  'hub/tours': {
    src: '/media/hubs/tours.jpg',
    alt: "Bird's-eye view of Nashville during daytime.",
    credit: 'Kelly / Pexels',
    licence: 'Pexels License',
    width: 1600,
    height: 1067,
  },
  'hub/weekend': {
    src: '/media/hubs/weekend.jpg',
    alt: 'Nashville skyline with pedestrian bridge at sunrise.',
    credit: 'gapeppy1 / Pexels',
    licence: 'Pexels License',
    width: 1600,
    height: 1067,
  },
  'hub/wellness': {
    src: '/media/hubs/wellness.jpg',
    alt: 'A clean wood-lined sauna in a Nashville wellness amenity.',
    licence: 'BPH-owned media — user-authorized reuse on 2026-08-04',
    width: 1600,
    height: 1067,
  },
  'neighborhood/12-south': {
    src: '/media/neighborhoods/12-south.jpg',
    alt: 'Draper James shopfront on 12th Avenue South in the 12 South neighborhood.',
    credit: 'Nashville Convention & Visitors Corp',
    licence: 'Nashville CVC Media Library — usage authorization pending',
    width: 1800,
    height: 1200,
  },
  'neighborhood/downtown-broadway': {
    src: '/media/neighborhoods/downtown-broadway.jpg',
    alt: 'Robert’s Western World on Lower Broadway in downtown Nashville.',
    credit: 'Nashville Convention & Visitors Corp',
    licence: 'Nashville CVC Media Library — usage authorization pending',
    width: 1800,
    height: 1200,
  },
  'neighborhood/east-nashville': {
    src: '/media/neighborhoods/east-nashville.jpg',
    alt: 'Rosemary & Beauty Queen exterior in East Nashville.',
    credit: 'Nashville Convention & Visitors Corp',
    licence: 'Nashville CVC Media Library — usage authorization pending',
    width: 1800,
    height: 1200,
  },
  'neighborhood/germantown': {
    src: '/media/neighborhoods/germantown.jpg',
    alt: 'The Cupcake Collection storefront in Germantown, Nashville.',
    credit: 'Nashville Convention & Visitors Corp',
    licence: 'Nashville CVC Media Library — usage authorization pending',
    width: 1800,
    height: 1200,
  },
  'neighborhood/green-hills': {
    src: '/media/neighborhoods/green-hills.jpg',
    alt: 'The Bluebird Cafe exterior in Green Hills, Nashville.',
    credit: 'Nashville Convention & Visitors Corp',
    licence: 'Nashville CVC Media Library — usage authorization pending',
    width: 1800,
    height: 1200,
  },
  'neighborhood/hillsboro-village': {
    src: '/media/neighborhoods/hillsboro-village.jpg',
    alt: 'The Belcourt Theatre in Hillsboro Village, Nashville.',
    credit: 'Nashville Convention & Visitors Corp',
    licence: 'Nashville CVC Media Library — usage authorization pending',
    width: 1800,
    height: 1200,
  },
  'neighborhood/midtown': {
    src: '/media/neighborhoods/midtown.jpg',
    alt: 'Odie’s Bar exterior neon and patio overlooking Division Street in Midtown Nashville.',
    credit: 'Nashville Convention & Visitors Corp',
    licence: 'Nashville CVC Media Library — usage authorization pending',
    width: 1800,
    height: 1200,
  },
  'neighborhood/music-row': {
    src: '/media/neighborhoods/music-row.jpg',
    alt: 'Music Row streetscape in Nashville.',
    credit: 'Nashville Convention & Visitors Corp',
    licence: 'Nashville CVC Media Library — usage authorization pending',
    width: 1800,
    height: 1200,
  },
  'neighborhood/the-gulch': {
    src: '/media/neighborhoods/the-gulch.jpg',
    alt: 'Biscuit Love restaurant in the Gulch, Nashville.',
    credit: 'Nashville Convention & Visitors Corp',
    licence: 'Nashville CVC Media Library — usage authorization pending',
    width: 1800,
    height: 1200,
  },
  'neighborhood/wedgewood-houston': {
    src: '/media/neighborhoods/wedgewood-houston.jpg',
    alt: 'Bastion restaurant exterior in Wedgewood-Houston, Nashville.',
    credit: 'Nashville Convention & Visitors Corp',
    licence: 'Nashville CVC Media Library — usage authorization pending',
    width: 1800,
    height: 1200,
  },
  'neighborhood/sylvan-park': {
    src: '/media/neighborhoods/sylvan-park.jpg',
    alt: 'Sylvan Supply storefront in Sylvan Park, Nashville.',
    credit: 'Nashville Convention & Visitors Corp',
    licence: 'Nashville CVC Media Library — usage authorization pending',
    width: 1800,
    height: 1200,
  },
  'neighborhood/west-end': {
    src: '/media/neighborhoods/west-end.jpg',
    alt: 'The Parthenon at Centennial Park along West End Avenue.',
    credit: 'Nashville Convention & Visitors Corp',
    licence: 'Nashville CVC Media Library — usage authorization pending',
    width: 1800,
    height: 1200,
  },

  'guide/first-time-visitors': {
    src: '/media/guides/first-time-visitors.jpg',
    alt: 'Aerial view of the downtown Nashville skyline.',
    credit: 'Nashville Convention & Visitors Corp',
    licence: 'Nashville CVC Media Library — usage authorization pending',
    width: 2000,
    height: 1250,
  },
  'guide/weekend-itinerary': {
    src: '/media/guides/weekend-itinerary.jpg',
    alt: 'Three guests dining on a rooftop terrace overlooking Nashville.',
    credit: 'Four Seasons Hotels and Resorts',
    licence: 'Four Seasons press library — usage authorization pending',
    width: 2000,
    height: 1250,
  },
  'guide/where-to-stay': {
    src: '/media/guides/where-to-stay.jpg',
    alt: 'The lobby of the Hermitage Hotel in downtown Nashville.',
    credit: 'Nashville Convention & Visitors Corp',
    licence: 'Nashville CVC Media Library — usage authorization pending',
    width: 2000,
    height: 1250,
  },
  'hero/nashroam-skyline': {
    src: '/media/hero/nashroam-skyline-hero.jpg',
    srcMobile: '/media/hero/nashroam-skyline-hero-mobile.jpg',
    alt: 'Downtown Nashville at sunset above the Cumberland River and Korean Veterans Memorial Bridge.',
    credit: 'Four Seasons Hotels and Resorts',
    licence: 'Four Seasons press library — usage authorization pending',
    width: 2400,
    height: 1350,
    objectPosition: 'center',
    objectPositionMobile: '56% center',
  },
  'hub/events-premium': {
    src: '/media/hubs/events-premium.jpg',
    alt: 'People dancing outdoors at a Musicians Corner concert in Nashville.',
    credit: 'Nashville Convention & Visitors Corp',
    licence: 'Nashville CVC Media Library — usage authorization pending',
    width: 1800,
    height: 1200,
  },
  'hub/hotels-premium': {
    src: '/media/hubs/hotels-premium.jpg',
    alt: 'Rooftop terrace bar overlooking the Nashville skyline.',
    credit: 'Four Seasons Hotels and Resorts',
    licence: 'Four Seasons press library — usage authorization pending',
    width: 1800,
    height: 1200,
  },
  'hub/live-music-premium': {
    src: '/media/hubs/live-music-premium.jpg',
    alt: 'Cassadee Pope performing at the Ryman Auditorium.',
    credit: 'Nashville Convention & Visitors Corp',
    licence: 'Nashville CVC Media Library — usage authorization pending',
    width: 1800,
    height: 1200,
  },
  'hub/restaurants-premium': {
    src: '/media/hubs/restaurants-premium.jpg',
    alt: 'The cocktail bar at Twelve Thirty Club in Nashville.',
    credit: 'Nashville Convention & Visitors Corp',
    licence: 'Nashville CVC Media Library — usage authorization pending',
    width: 1800,
    height: 1200,
  },
  'hub/things-to-do-premium': {
    src: '/media/hubs/things-to-do-premium.jpg',
    alt: 'A Gray Line tour bus parked in front of the Parthenon in Centennial Park.',
    credit: 'Nashville Convention & Visitors Corp',
    licence: 'Nashville CVC Media Library — usage authorization pending',
    width: 1800,
    height: 1200,
  },
  'hub/trip-planner-premium': {
    src: '/media/hubs/trip-planner-premium.jpg',
    alt: 'Nashville skyline seen from a pedestrian bridge.',
    credit: 'Nashville Convention & Visitors Corp',
    licence: 'Nashville CVC Media Library — usage authorization pending',
    width: 1800,
    height: 1200,
  },
  'trending/live-tonight': {
    src: '/media/trending/live-tonight.jpg',
    alt: 'A live concert crowd in Nashville.',
    credit: 'Nashville Convention & Visitors Corp',
    licence: 'Nashville CVC Media Library — usage authorization pending',
    width: 1800,
    height: 1200,
  },
  'trending/weekender': {
    src: '/media/trending/weekender.jpg',
    alt: 'Aerial view of the Tennessee State Capitol and downtown Nashville skyline with green parkland.',
    credit: 'Nashville Convention & Visitors Corp',
    licence: 'Nashville CVC Media Library — usage authorization pending',
    width: 1800,
    height: 1200,
  },
  'venues/delux-weho-exterior': {
    src: '/media/venues/delux-weho-exterior.jpg',
    alt: 'Exterior entrance at DELUX WeHo in Nashville.',
    licence: 'BPH-owned media — user-authorized reuse on 2026-08-04',
    width: 1600,
    height: 1067,
  },
  'venues/jbjs-food': {
    src: '/media/venues/jbjs-food.jpg',
    alt: 'Food served at JBJ’s Nashville.',
    licence: 'BPH-owned media — user-authorized reuse on 2026-08-04',
    width: 1600,
    height: 1067,
  },
  'venues/jbjs-interior': {
    src: '/media/venues/jbjs-interior.jpg',
    alt: 'Interior level at JBJ’s Nashville with seating and the venue’s Bon Jovi wall.',
    licence: 'BPH-owned media — user-authorized reuse on 2026-08-04',
    width: 1600,
    height: 1067,
  },
  'venues/jbjs-rooftop': {
    src: '/media/venues/jbjs-rooftop.jpg',
    alt: 'JBJ’s rooftop overlooking Lower Broadway in Nashville.',
    licence: 'BPH-owned media — user-authorized reuse on 2026-08-04',
    width: 1600,
    height: 1067,
  },
  'venues/the-lanes-homes': {
    src: '/media/venues/the-lanes-homes.jpg',
    alt: 'Exterior of homes at Solaya at The Lanes in Nashville.',
    licence: 'BPH-owned media — user-authorized reuse on 2026-08-04',
    width: 1600,
    height: 1067,
  },
} as const satisfies Record<string, MediaAsset>;

export type ImageKey = keyof typeof images;

export const AVAILABLE_MEDIA: ReadonlySet<string> = new Set<string>([
  'hero/video',
  'editorial/broadway-nightlife',
  'editorial/broadway-rooftop-day',
  'editorial/cocktail-service',
  'editorial/grand-ole-opry-house',
  'editorial/live-music-crowd',
  'editorial/live-performance-overhead',
  'editorial/music-row-studio-b',
  'editorial/nashville-food',
  'editorial/opryland-atrium',
  'editorial/parthenon-west-end',
  'editorial/private-events',
  'editorial/printers-alley',
  'editorial/rooftop-party',
  'editorial/the-lanes-community-center',
  'editorial/the-lanes-greenway',
  'editorial/the-lanes-homes',
  'editorial/the-lanes-outdoor-living',
  'editorial/the-lanes-pool',
  'editorial/the-lanes-runner-dog',
  'editorial/weho-fitness',
  'editorial/weho-interior-design',
  'editorial/weho-lounge',
  'editorial/weho-pool',
  'editorial/weho-sauna',
  'editorial/weho-skyline',
  'editorial/skyline',
  'hero/downtown-rooftop',
  'hero/live-music-night',
  'hero/lower-broadway',
  'hero/nashroam-skyline',
  'guide/first-time-visitors',
  'guide/weekend-itinerary',
  'guide/where-to-stay',
  'hub/events-premium',
  'hub/hotels-premium',
  'hub/live-music-premium',
  'hub/restaurants-premium',
  'hub/things-to-do-premium',
  'hub/trip-planner-premium',
  'trending/live-tonight',
  'trending/weekender',
  'hub/bachelorette',
  'hub/honky-tonk-highway',
  'hub/hotels',
  'hub/live-music',
  'hub/opryland',
  'hub/outdoor-living',
  'hub/pool',
  'hub/restaurants',
  'hub/tickets',
  'hub/tours',
  'hub/weekend',
  'hub/wellness',
  'neighborhood/12-south',
  'neighborhood/downtown-broadway',
  'neighborhood/east-nashville',
  'neighborhood/germantown',
  'neighborhood/green-hills',
  'neighborhood/hillsboro-village',
  'neighborhood/midtown',
  'neighborhood/music-row',
  'neighborhood/sylvan-park',
  'neighborhood/the-gulch',
  'neighborhood/wedgewood-houston',
  'neighborhood/west-end',
  'venues/delux-weho-exterior',
  'venues/jbjs-food',
  'venues/jbjs-interior',
  'venues/jbjs-rooftop',
  'venues/the-lanes-homes',
]);

export function getImage(key: ImageKey | undefined): MediaAsset | undefined {
  return key ? images[key] : undefined;
}

export function hasMedia(key: string): boolean {
  return AVAILABLE_MEDIA.has(key);
}
