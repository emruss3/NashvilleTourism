/**
 * Media system.
 *
 * Real photography and video are referenced here by a stable key. Components
 * never hardcode a path. Drop the licensed files into `public/media/` using the
 * filenames below and every surface that uses the key picks them up.
 *
 * Until a file exists, `SmartImage` renders a typographic fallback rather than
 * a broken image or a stock photo that misrepresents a specific business.
 * See `public/media/README.md` for the sourcing brief.
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
  webm: '/media/video/nashville-hero.webm',
  mp4: '/media/video/nashville-hero.mp4',
  poster: '/media/hero/live-music-hero.jpg',
  alt: 'Live band performing on stage at night with the crowd in view under magenta and teal lights.',
  credit: 'K / Pexels',
  licence: 'Pexels Licence · video 9481012',
};

/**
 * Keyed image library. Keys are referenced from content records and components.
 * `width`/`height` are the intrinsic dimensions of the file you drop in.
 */
export const images = {
  'hero/lower-broadway': {
    src: '/media/hero/lower-broadway-day.jpg',
    alt: 'Nashville skyline and the John Seigenthaler Pedestrian Bridge across the Cumberland River.',
    credit: 'Cameron Stewart / Unsplash',
    licence: 'Unsplash Licence',
    width: 2400,
    height: 1600,
  },
  'neighborhood/downtown-broadway': {
    src: '/media/neighborhoods/downtown-broadway.jpg',
    alt: 'Pedestrians crossing a downtown Nashville street with neon signs beyond.',
    credit: 'Cody Lannom / Unsplash',
    licence: 'Unsplash Licence',
    width: 1600,
    height: 1067,
  },
  'neighborhood/12-south': {
    src: '/media/neighborhoods/12-south.jpg',
    alt: 'Aerial view of a leafy urban neighborhood with streets and low buildings.',
    credit: 'Pedro Lastra / Unsplash',
    licence: 'Unsplash Licence',
    width: 1600,
    height: 1067,
  },
  'neighborhood/the-gulch': {
    src: '/media/neighborhoods/the-gulch.jpg',
    alt: 'City skyline at dusk with mid-rise buildings and lit streets.',
    credit: 'Pedro Lastra / Unsplash',
    licence: 'Unsplash Licence',
    width: 1600,
    height: 1067,
  },
  'neighborhood/east-nashville': {
    src: '/media/neighborhoods/east-nashville.jpg',
    alt: 'City street with storefronts and traffic on a clear day.',
    credit: 'Andreas Dress / Unsplash',
    licence: 'Unsplash Licence',
    width: 1600,
    height: 1067,
  },
  'neighborhood/germantown': {
    src: '/media/neighborhoods/germantown.jpg',
    alt: 'Historic brick buildings along a quiet urban street.',
    credit: 'Benjamin Voros / Unsplash',
    licence: 'Unsplash Licence',
    width: 1600,
    height: 1067,
  },
  'neighborhood/wedgewood-houston': {
    src: '/media/neighborhoods/wedgewood-houston.jpg',
    alt: 'Modern glass and steel buildings against a clear sky.',
    credit: 'Pedro Lastra / Unsplash',
    licence: 'Unsplash Licence',
    width: 1600,
    height: 1067,
  },
  'neighborhood/midtown': {
    src: '/media/neighborhoods/midtown.jpg',
    alt: 'Bright open office interiors with desks and windows.',
    credit: 'Nastuh Abootalebi / Unsplash',
    licence: 'Unsplash Licence',
    width: 1600,
    height: 1067,
  },
  'neighborhood/hillsboro-village': {
    src: '/media/neighborhoods/hillsboro-village.jpg',
    alt: 'Restaurant dining room with warm lighting and wooden tables.',
    credit: 'Jay Wennington / Unsplash',
    licence: 'Unsplash Licence',
    width: 1600,
    height: 1067,
  },
  'neighborhood/sylvan-park': {
    src: '/media/neighborhoods/sylvan-park.jpg',
    alt: 'Residential house exterior on a tree-lined street.',
    credit: 'Brian Babb / Unsplash',
    licence: 'Unsplash Licence',
    width: 1600,
    height: 1067,
  },
  'neighborhood/green-hills': {
    src: '/media/neighborhoods/green-hills.jpg',
    alt: 'Retail shopping corridor with clothing displays.',
    credit: 'Christian Wiediger / Unsplash',
    licence: 'Unsplash Licence',
    width: 1600,
    height: 1067,
  },
  'hub/hotels': {
    src: '/media/hubs/hotels.jpg',
    alt: 'Resort pool and hotel buildings under blue sky.',
    credit: 'Jerry Wang / Unsplash',
    licence: 'Unsplash Licence',
    width: 1600,
    height: 1067,
  },
  'hub/restaurants': {
    src: '/media/hubs/restaurants.jpg',
    alt: 'Plated dishes on a restaurant table ready to serve.',
    credit: 'Jay Wennington / Unsplash',
    licence: 'Unsplash Licence',
    width: 1600,
    height: 1067,
  },
  'hub/tours': {
    src: '/media/hubs/tours.jpg',
    alt: 'Open road through mountains on a clear travel day.',
    credit: 'Dino Reichmuth / Unsplash',
    licence: 'Unsplash Licence',
    width: 1600,
    height: 1067,
  },
  'hub/tickets': {
    src: '/media/hubs/tickets.jpg',
    alt: 'Crowd at a live outdoor concert under stage lights.',
    credit: 'Nicholas Green / Unsplash',
    licence: 'Unsplash Licence',
    width: 1600,
    height: 1067,
  },
  'hub/live-music': {
    src: '/media/hubs/live-music.jpg',
    alt: 'Concert crowd facing a brightly lit stage.',
    credit: 'Micah Tindell / Unsplash',
    licence: 'Unsplash Licence',
    width: 1600,
    height: 1067,
  },
  'hub/honky-tonk-highway': {
    src: '/media/hubs/honky-tonk-highway.jpg',
    alt: 'Musician performing under stage lights with a guitar.',
    credit: 'Austin Neill / Unsplash',
    licence: 'Unsplash Licence',
    width: 1600,
    height: 1067,
  },
  'hub/weekend': {
    src: '/media/hubs/weekend.jpg',
    alt: 'Nashville skyline and pedestrian bridge across the Cumberland River.',
    credit: 'Cameron Stewart / Unsplash',
    licence: 'Unsplash Licence',
    width: 1600,
    height: 1067,
  },
  'hub/bachelorette': {
    src: '/media/hubs/bachelorette.jpg',
    alt: 'Friends laughing together outdoors on a trip.',
    credit: 'Duong Nhan / Unsplash',
    licence: 'Unsplash Licence',
    width: 1600,
    height: 1067,
  },
  'hub/opryland': {
    src: '/media/hubs/opryland.jpg',
    alt: 'Hotel suite interior with seating and a city view.',
    credit: 'Point3D Commercial / Unsplash',
    licence: 'Unsplash Licence',
    width: 1600,
    height: 1067,
  },
} as const satisfies Record<string, MediaAsset>;

export type ImageKey = keyof typeof images;

export function getImage(key: ImageKey | undefined): MediaAsset | undefined {
  return key ? images[key] : undefined;
}

/**
 * Which media files have actually been added to the repo.
 *
 * Static export cannot stat the filesystem from a client component, so this is
 * an explicit allowlist. Add a key here once the real file is committed, and
 * the UI switches from the fallback to the photograph.
 */
export const AVAILABLE_MEDIA: ReadonlySet<string> = new Set<string>([
  'hero/video',
  'hero/lower-broadway',
  'hub/hotels',
  'hub/restaurants',
  'hub/tours',
  'hub/tickets',
  'hub/live-music',
  'hub/honky-tonk-highway',
  'hub/weekend',
  'hub/bachelorette',
  'hub/opryland',
  'neighborhood/downtown-broadway',
  'neighborhood/12-south',
  'neighborhood/the-gulch',
  'neighborhood/east-nashville',
  'neighborhood/germantown',
  'neighborhood/wedgewood-houston',
  'neighborhood/midtown',
  'neighborhood/hillsboro-village',
  'neighborhood/sylvan-park',
  'neighborhood/green-hills',
]);

export function hasMedia(key: string): boolean {
  return AVAILABLE_MEDIA.has(key);
}
