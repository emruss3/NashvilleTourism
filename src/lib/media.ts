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
  // Drop the licensed files here and the hero switches from still to video.
  webm: '/media/video/lower-broadway-night.webm',
  mp4: '/media/video/lower-broadway-night.mp4',
  poster: '/media/hero/lower-broadway-night.jpg',
  alt: 'Neon signs along Lower Broadway in downtown Nashville after dark.',
  credit: '[Photographer or agency]',
  licence: '[Licence reference]',
};

/**
 * Keyed image library. Keys are referenced from content records and components.
 * `width`/`height` are the intrinsic dimensions of the file you drop in.
 */
export const images = {
  'hero/lower-broadway': {
    src: '/media/hero/lower-broadway-night.jpg',
    alt: 'Neon signs along Lower Broadway in downtown Nashville after dark.',
    width: 2400,
    height: 1350,
  },
  'neighborhood/downtown-broadway': {
    src: '/media/neighborhoods/downtown-broadway.jpg',
    alt: 'Honky-tonk bar fronts and neon signage on Lower Broadway.',
    width: 1600,
    height: 1067,
  },
  'neighborhood/12-south': {
    src: '/media/neighborhoods/12-south.jpg',
    alt: 'Shopfronts and street trees along 12th Avenue South.',
    width: 1600,
    height: 1067,
  },
  'neighborhood/the-gulch': {
    src: '/media/neighborhoods/the-gulch.jpg',
    alt: 'Mid-rise buildings and street-level storefronts in the Gulch.',
    width: 1600,
    height: 1067,
  },
  'neighborhood/east-nashville': {
    src: '/media/neighborhoods/east-nashville.jpg',
    alt: 'Independent storefronts on a residential street in East Nashville.',
    width: 1600,
    height: 1067,
  },
  'neighborhood/germantown': {
    src: '/media/neighborhoods/germantown.jpg',
    alt: 'Brick buildings along a historic street in Germantown.',
    width: 1600,
    height: 1067,
  },
  'neighborhood/wedgewood-houston': {
    src: '/media/neighborhoods/wedgewood-houston.jpg',
    alt: 'Converted warehouse buildings in Wedgewood-Houston.',
    width: 1600,
    height: 1067,
  },
  'neighborhood/midtown': {
    src: '/media/neighborhoods/midtown.jpg',
    alt: 'Music Row offices in converted houses in Midtown Nashville.',
    width: 1600,
    height: 1067,
  },
  'neighborhood/hillsboro-village': {
    src: '/media/neighborhoods/hillsboro-village.jpg',
    alt: 'Storefronts along the Hillsboro Village commercial strip.',
    width: 1600,
    height: 1067,
  },
  'neighborhood/sylvan-park': {
    src: '/media/neighborhoods/sylvan-park.jpg',
    alt: 'Tree-lined residential street in Sylvan Park.',
    width: 1600,
    height: 1067,
  },
  'neighborhood/green-hills': {
    src: '/media/neighborhoods/green-hills.jpg',
    alt: 'Shopping district along Hillsboro Pike in Green Hills.',
    width: 1600,
    height: 1067,
  },
  'hub/hotels': {
    src: '/media/hubs/hotels.jpg',
    alt: 'Hotel room with a view over downtown Nashville.',
    width: 1600,
    height: 1067,
  },
  'hub/tours': {
    src: '/media/hubs/tours.jpg',
    alt: 'An open-air party bus on a downtown Nashville street.',
    width: 1600,
    height: 1067,
  },
  'hub/tickets': {
    src: '/media/hubs/tickets.jpg',
    alt: 'A crowd watching a band perform on stage in Nashville.',
    width: 1600,
    height: 1067,
  },
  'hub/live-music': {
    src: '/media/hubs/live-music.jpg',
    alt: 'A band playing to a full room in a Nashville venue.',
    width: 1600,
    height: 1067,
  },
  'hub/honky-tonk-highway': {
    src: '/media/hubs/honky-tonk-highway.jpg',
    alt: 'Crowds outside the bars on Broadway on a busy evening.',
    width: 1600,
    height: 1067,
  },
  'hub/weekend': {
    src: '/media/hubs/weekend.jpg',
    alt: 'The Nashville skyline seen from the pedestrian bridge at dusk.',
    width: 1600,
    height: 1067,
  },
  'hub/bachelorette': {
    src: '/media/hubs/bachelorette.jpg',
    alt: 'A group walking together along a downtown Nashville sidewalk.',
    width: 1600,
    height: 1067,
  },
  'hub/opryland': {
    src: '/media/hubs/opryland.jpg',
    alt: 'Resort grounds near Opryland in Music Valley.',
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
  // Add a key here once the real file is committed under public/media/.
  // 'hero/video' is the special key that switches the hero from still to video;
  // it requires BOTH the .webm and .mp4 files plus the poster still.
  // e.g. 'hero/lower-broadway',
  // e.g. 'hero/video',
]);

export function hasMedia(key: string): boolean {
  return AVAILABLE_MEDIA.has(key);
}
