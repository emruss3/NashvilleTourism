/**
 * Media system.
 *
 * Real photography and video are referenced here by a stable key. Components
 * never hardcode a path. Drop the licensed files into `public/media/` using the
 * filenames below and every surface that uses the key picks them up.
 *
 * Production rule: an image may render only when it is in AVAILABLE_MEDIA
 * (`rightsStatus === 'cleared'` && `approvalStatus === 'approved'`).
 * TEMP_ALLOW_UNCLEARED_MEDIA temporarily also shows uncleared keys (CVC /
 * pending press). Flip that flag off before any production rights claim.
 * Missing keys still render a typographic fallback — never a wrong-business
 * substitute. See `public/media/README.md` and
 * `docs/media/COMMERCIAL-MEDIA-SOURCING.md`.
 *
 * This module is imported by client components — never import node:fs/path here.
 */

import { adobePurchaseMedia, restoredMedia } from './media-restored';
import type { MediaAsset, VideoAsset } from './media-types';

export type { MediaAsset, VideoAsset } from './media-types';

/** TEMP: show uncleared stills. Hero video stays the cleared Pexels drone loop — uncleared hero keys stay gated. Set false before launch claims. */
export const TEMP_ALLOW_UNCLEARED_MEDIA = true;

/**
 * Adobe purchase stubs stay out of the client bundle until licensed files land.
 * Do not reintroduce filesystem probes here — they break the Next client build.
 */
const adobeReadyMedia = {} as Partial<typeof adobePurchaseMedia>;

export const heroVideo: VideoAsset = {
  webm: '/media/hero/nashville-hero.webm',
  mp4: '/media/hero/nashville-hero.mp4',
  poster: '/media/hero/nashville-hero-drone-poster.jpg',
  alt: "Drone footage of Nashville's downtown skyline on a clear day.",
  credit: 'Alexander Wark Feeney / Pexels',
  licence: 'Pexels License',
};

const baseImages = {
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
    licence: 'CVC / Visit Music City — reference-only; not licensed; do not ship',
    width: 1800,
    height: 1200,
  },
  'neighborhood/downtown-broadway': {
    src: '/media/neighborhoods/downtown-broadway-2400.webp',
    srcSet:
      '/media/neighborhoods/downtown-broadway-960.webp 960w, /media/neighborhoods/downtown-broadway-1600.webp 1600w, /media/neighborhoods/downtown-broadway-2400.webp 2199w',
    srcMobile: '/media/neighborhoods/downtown-broadway-mobile-1400.webp',
    srcMobileSet:
      '/media/neighborhoods/downtown-broadway-mobile-960.webp 960w, /media/neighborhoods/downtown-broadway-mobile-1400.webp 1174w',
    alt: "Robert's Western World and Lower Broadway neon on a busy downtown Nashville block.",
    credit: 'Nashville Convention & Visitors Corp',
    licence: 'CVC / Visit Music City — reference-only; not licensed; do not ship',
    width: 2199,
    height: 1237,
    objectPosition: 'center',
    objectPositionMobile: 'center',
  },
  'neighborhood/east-nashville': {
    src: '/media/neighborhoods/east-nashville.jpg',
    alt: 'Rosemary & Beauty Queen exterior in East Nashville.',
    credit: 'Nashville Convention & Visitors Corp',
    licence: 'CVC / Visit Music City — reference-only; not licensed; do not ship',
    width: 1800,
    height: 1200,
  },
  'neighborhood/germantown': {
    src: '/media/neighborhoods/germantown.jpg',
    alt: 'The Cupcake Collection storefront in Germantown, Nashville.',
    credit: 'Nashville Convention & Visitors Corp',
    licence: 'CVC / Visit Music City — reference-only; not licensed; do not ship',
    width: 1800,
    height: 1200,
  },
  'neighborhood/green-hills': {
    src: '/media/neighborhoods/green-hills.jpg',
    alt: 'The Bluebird Cafe exterior in Green Hills, Nashville.',
    credit: 'Nashville Convention & Visitors Corp',
    licence: 'CVC / Visit Music City — reference-only; not licensed; do not ship',
    width: 1800,
    height: 1200,
  },
  'neighborhood/hillsboro-village': {
    src: '/media/neighborhoods/hillsboro-village.jpg',
    alt: 'The Belcourt Theatre in Hillsboro Village, Nashville.',
    credit: 'Nashville Convention & Visitors Corp',
    licence: 'CVC / Visit Music City — reference-only; not licensed; do not ship',
    width: 1800,
    height: 1200,
  },
  'neighborhood/midtown': {
    src: '/media/neighborhoods/midtown.jpg',
    alt: 'Odie’s Bar exterior neon and patio overlooking Division Street in Midtown Nashville.',
    credit: 'Nashville Convention & Visitors Corp',
    licence: 'CVC / Visit Music City — reference-only; not licensed; do not ship',
    width: 1800,
    height: 1200,
  },
  'neighborhood/music-row': {
    src: '/media/neighborhoods/music-row.jpg',
    alt: 'Music Row streetscape in Nashville.',
    credit: 'Nashville Convention & Visitors Corp',
    licence: 'CVC / Visit Music City — reference-only; not licensed; do not ship',
    width: 1800,
    height: 1200,
  },
  'neighborhood/the-gulch': {
    src: '/media/neighborhoods/the-gulch.jpg',
    alt: 'Biscuit Love restaurant in the Gulch, Nashville.',
    credit: 'Nashville Convention & Visitors Corp',
    licence: 'CVC / Visit Music City — reference-only; not licensed; do not ship',
    width: 1800,
    height: 1200,
  },
  'neighborhood/wedgewood-houston': {
    src: '/media/neighborhoods/wedgewood-houston.jpg',
    alt: 'Bastion restaurant exterior in Wedgewood-Houston, Nashville.',
    credit: 'Nashville Convention & Visitors Corp',
    licence: 'CVC / Visit Music City — reference-only; not licensed; do not ship',
    width: 1800,
    height: 1200,
  },
  'neighborhood/sylvan-park': {
    src: '/media/neighborhoods/sylvan-park.jpg',
    alt: 'Sylvan Supply storefront in Sylvan Park, Nashville.',
    credit: 'Nashville Convention & Visitors Corp',
    licence: 'CVC / Visit Music City — reference-only; not licensed; do not ship',
    width: 1800,
    height: 1200,
  },
  'neighborhood/west-end': {
    src: '/media/neighborhoods/west-end.jpg',
    alt: 'The Parthenon at Centennial Park along West End Avenue.',
    credit: 'Nashville Convention & Visitors Corp',
    licence: 'CVC / Visit Music City — reference-only; not licensed; do not ship',
    width: 1800,
    height: 1200,
  },

  'guide/first-time-visitors': {
    src: '/media/guides/first-time-visitors.jpg',
    alt: 'Aerial view of the downtown Nashville skyline.',
    credit: 'Nashville Convention & Visitors Corp',
    licence: 'CVC / Visit Music City — reference-only; not licensed; do not ship',
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
    licence: 'CVC / Visit Music City — reference-only; not licensed; do not ship',
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
    licence: 'CVC / Visit Music City — reference-only; not licensed; do not ship',
    width: 1800,
    height: 1200,
  },
  'hub/hotels-premium': {
    src: '/media/hubs/hotels-premium-2400.webp',
    srcSet:
      '/media/hubs/hotels-premium-960.webp 960w, /media/hubs/hotels-premium-1600.webp 1600w, /media/hubs/hotels-premium-2400.webp 1800w',
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
    licence: 'CVC / Visit Music City — reference-only; not licensed; do not ship',
    width: 1800,
    height: 1200,
  },
  'hub/restaurants-premium': {
    src: '/media/hubs/restaurants-premium-2400.webp',
    srcSet:
      '/media/hubs/restaurants-premium-960.webp 960w, /media/hubs/restaurants-premium-1600.webp 1600w, /media/hubs/restaurants-premium-2400.webp 1800w',
    alt: 'The cocktail bar at Twelve Thirty Club in Nashville.',
    credit: 'Nashville Convention & Visitors Corp',
    licence: 'CVC / Visit Music City — reference-only; not licensed; do not ship',
    width: 1800,
    height: 1200,
  },
  'hub/things-to-do-premium': {
    src: '/media/hubs/things-to-do-premium.jpg',
    alt: 'A Gray Line tour bus parked in front of the Parthenon in Centennial Park.',
    credit: 'Nashville Convention & Visitors Corp',
    licence: 'CVC / Visit Music City — reference-only; not licensed; do not ship',
    width: 1800,
    height: 1200,
  },
  'hub/trip-planner-premium': {
    src: '/media/hubs/trip-planner-premium-2400.webp',
    srcSet:
      '/media/hubs/trip-planner-premium-960.webp 960w, /media/hubs/trip-planner-premium-1600.webp 1600w, /media/hubs/trip-planner-premium-2400.webp 1800w',
    alt: 'Nashville skyline seen from a pedestrian bridge.',
    credit: 'Nashville Convention & Visitors Corp',
    licence: 'CVC / Visit Music City — reference-only; not licensed; do not ship',
    width: 1800,
    height: 1200,
  },
  'trending/live-tonight': {
    src: '/media/trending/live-tonight.jpg',
    alt: 'A live concert crowd in Nashville.',
    credit: 'Nashville Convention & Visitors Corp',
    licence: 'CVC / Visit Music City — reference-only; not licensed; do not ship',
    width: 1800,
    height: 1200,
  },
  'trending/weekender': {
    src: '/media/trending/weekender.jpg',
    alt: 'Aerial view of the Tennessee State Capitol and downtown Nashville skyline with green parkland.',
    credit: 'Nashville Convention & Visitors Corp',
    licence: 'CVC / Visit Music City — reference-only; not licensed; do not ship',
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
    src: '/media/venues/jbjs-rooftop-1600.webp',
    srcSet: '/media/venues/jbjs-rooftop-960.webp 960w, /media/venues/jbjs-rooftop-1600.webp 1600w',
    alt: "JBJ's rooftop overlooking Lower Broadway in Nashville.",
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
  'downtown/sobro': {
    src: '/media/downtown/sobro-1600.webp',
    srcSet:
      '/media/downtown/sobro-640.webp 640w, /media/downtown/sobro-960.webp 960w, /media/downtown/sobro-1600.webp 1600w',
    alt: 'Elevated blue-hour view of SoBro with Ascend Amphitheater, the Cumberland River, and downtown hotel towers.',
    credit: 'Four Seasons Hotels and Resorts',
    licence: 'Four Seasons press library — authorized editorial use',
    width: 1600,
    height: 1067,
  },
  'downtown/nashville-yards': {
    src: '/media/downtown/nashville-yards-1600.webp',
    srcSet:
      '/media/downtown/nashville-yards-640.webp 640w, /media/downtown/nashville-yards-960.webp 960w, /media/downtown/nashville-yards-1600.webp 1600w',
    srcMobile: '/media/downtown/nashville-yards-mobile-960.webp',
    srcMobileSet:
      '/media/downtown/nashville-yards-mobile-640.webp 640w, /media/downtown/nashville-yards-mobile-960.webp 960w',
    alt: 'Grand Hyatt Nashville and surrounding Nashville Yards mixed-use buildings at dusk.',
    credit: 'Grand Hyatt Nashville / Hyatt Hotels',
    licence: 'Official hotel distribution (IcePortal)',
    width: 1600,
    height: 1067,
  },
  'venues/roberts-western-world': {
    src: '/media/venues/roberts-western-world-1600.webp',
    srcSet:
      '/media/venues/roberts-western-world-640.webp 640w, /media/venues/roberts-western-world-960.webp 960w, /media/venues/roberts-western-world-1600.webp 1234w',
    alt: "Stage interior at Robert's Western World with drum kit branding, neon lighting, and memorabilia-lined walls.",
    credit: "Robert's Western World",
    licence: 'Official venue website media',
    width: 1234,
    height: 823,
  },
  'venues/twelve-thirty-club': {
    src: '/media/venues/twelve-thirty-club-1600.webp',
    srcSet:
      '/media/venues/twelve-thirty-club-640.webp 640w, /media/venues/twelve-thirty-club-960.webp 960w, /media/venues/twelve-thirty-club-1600.webp 1600w',
    alt: 'Twelve Thirty Club supper club bar with red and green leather seating, brass, marble, and dark wood.',
    credit: 'Nashville Convention & Visitors Corp / property media',
    licence: 'CVC or unresolved property media — reference-only / pending clearance; do not ship',
    width: 1600,
    height: 1067,
  },
  'venues/chiefs-on-broadway': {
    src: '/media/venues/chiefs-on-broadway-1600.webp',
    srcSet:
      '/media/venues/chiefs-on-broadway-640.webp 640w, /media/venues/chiefs-on-broadway-960.webp 960w, /media/venues/chiefs-on-broadway-1600.webp 1600w',
    alt: "Chief's on Broadway dusk exterior with restored brick facade, stained-glass windows, and illuminated marquee.",
    credit: "Chief's on Broadway",
    licence: 'Official venue website media',
    width: 1600,
    height: 1067,
  },
  'venues/category-10': {
    src: '/media/venues/category-10-1600.webp',
    srcSet:
      '/media/venues/category-10-640.webp 640w, /media/venues/category-10-960.webp 960w, /media/venues/category-10-1600.webp 1600w',
    srcMobile: '/media/venues/category-10-mobile-960.webp',
    srcMobileSet:
      '/media/venues/category-10-mobile-640.webp 640w, /media/venues/category-10-mobile-960.webp 960w',
    alt: 'Category 10 main floor crowd with balcony mezzanine and Category 10 neon identity.',
    credit: 'Category 10 / Nathan Zucker',
    licence: 'Official category10.com media',
    width: 1600,
    height: 1067,
  },
  'restaurants/assembly-food-hall': {
    src: '/media/restaurants/assembly-food-hall-1600.webp',
    srcSet:
      '/media/restaurants/assembly-food-hall-640.webp 640w, /media/restaurants/assembly-food-hall-960.webp 960w, /media/restaurants/assembly-food-hall-1600.webp 1600w',
    alt: 'Interior of Assembly Food Hall with multiple vendor counters and open circulation.',
    credit: 'Food Hall Co / Assembly Food Hall',
    licence: 'Official property media',
    width: 1600,
    height: 1067,
  },
  'restaurants/bacco': {
    src: '/media/restaurants/bacco-1600.webp',
    srcSet:
      '/media/restaurants/bacco-640.webp 640w, /media/restaurants/bacco-960.webp 960w, /media/restaurants/bacco-1600.webp 1600w',
    alt: 'Bacco dining room with green banquettes, open kitchen, dry-aging cabinet, and patterned floor.',
    credit: 'Four Seasons Hotels and Resorts',
    licence: 'Four Seasons press library — authorized editorial use',
    width: 1600,
    height: 1067,
  },
  'restaurants/etch': {
    src: '/media/restaurants/etch-1600.webp',
    srcSet:
      '/media/restaurants/etch-640.webp 640w, /media/restaurants/etch-960.webp 960w, /media/restaurants/etch-1600.webp 1600w',
    alt: "Populated dining room and chef's bar interior at etch restaurant downtown.",
    credit: 'etch restaurant',
    licence: 'Official restaurant website media',
    width: 1600,
    height: 1067,
  },
  'hotels/four-seasons-nashville': {
    src: '/media/hotels/four-seasons-nashville-1600.webp',
    srcSet:
      '/media/hotels/four-seasons-nashville-640.webp 640w, /media/hotels/four-seasons-nashville-960.webp 960w, /media/hotels/four-seasons-nashville-1600.webp 1600w',
    srcMobile: '/media/hotels/four-seasons-nashville-mobile-960.webp',
    srcMobileSet:
      '/media/hotels/four-seasons-nashville-mobile-640.webp 640w, /media/hotels/four-seasons-nashville-mobile-960.webp 960w',
    alt: 'Four Seasons Hotel Nashville rooftop pool and terrace overlooking the Cumberland River.',
    credit: 'Four Seasons Hotels and Resorts',
    licence: 'Four Seasons press library — authorized editorial use',
    width: 1600,
    height: 1067,
  },
  'hotels/1-hotel-nashville': {
    src: '/media/hotels/1-hotel-nashville-1600.webp',
    srcSet:
      '/media/hotels/1-hotel-nashville-640.webp 640w, /media/hotels/1-hotel-nashville-960.webp 960w, /media/hotels/1-hotel-nashville-1600.webp 1600w',
    alt: '1 Hotel Nashville lobby with timber structure, leather seating, and abundant greenery.',
    credit: '1 Hotels',
    licence: 'Official brand media (Brandfolder)',
    width: 1600,
    height: 1067,
  },
  'hotels/the-joseph': {
    src: '/media/hotels/the-joseph-1600.webp',
    srcSet:
      '/media/hotels/the-joseph-640.webp 640w, /media/hotels/the-joseph-960.webp 960w, /media/hotels/the-joseph-1600.webp 1600w',
    srcMobile: '/media/hotels/the-joseph-mobile-960.webp',
    srcMobileSet:
      '/media/hotels/the-joseph-mobile-640.webp 640w, /media/hotels/the-joseph-mobile-960.webp 960w',
    alt: 'Rooftop pool at The Joseph, a Luxury Collection Hotel, Nashville.',
    credit: 'Marriott International / The Joseph Nashville',
    licence: 'Official Marriott gallery media',
    width: 1600,
    height: 1067,
  },
  'hotels/hermitage-hotel': {
    src: '/media/hotels/hermitage-hotel-1600.webp',
    srcSet:
      '/media/hotels/hermitage-hotel-640.webp 640w, /media/hotels/hermitage-hotel-960.webp 960w, /media/hotels/hermitage-hotel-1600.webp 1500w',
    alt: 'Grand Hermitage Hotel lobby with vaulted historic ceiling, fireplace, chandeliers, and central floral table.',
    credit: 'The Hermitage Hotel / Nashville CVC media',
    licence: 'CVC or unresolved property media — reference-only / pending clearance; do not ship',
    width: 1500,
    height: 1000,
  },
  'hotels/grand-hyatt-nashville': {
    src: '/media/hotels/grand-hyatt-nashville-1600.webp',
    srcSet:
      '/media/hotels/grand-hyatt-nashville-640.webp 640w, /media/hotels/grand-hyatt-nashville-960.webp 960w, /media/hotels/grand-hyatt-nashville-1600.webp 1600w',
    srcMobile: '/media/hotels/grand-hyatt-nashville-mobile-960.webp',
    srcMobileSet:
      '/media/hotels/grand-hyatt-nashville-mobile-640.webp 640w, /media/hotels/grand-hyatt-nashville-mobile-960.webp 960w',
    alt: 'Grand Hyatt Nashville rooftop pool at twilight with Nashville Yards skyline context.',
    credit: 'Grand Hyatt Nashville / Hyatt Hotels',
    licence: 'Official hotel distribution (IcePortal)',
    width: 1600,
    height: 1067,
  },
  'editorial/pedestrian-bridge': {
    src: '/media/editorial/pedestrian-bridge-2400.webp',
    srcSet:
      '/media/editorial/pedestrian-bridge-800.webp 800w, /media/editorial/pedestrian-bridge-1200.webp 1200w, /media/editorial/pedestrian-bridge-1600.webp 1600w, /media/editorial/pedestrian-bridge-2400.webp 2400w',
    srcMobile: '/media/editorial/pedestrian-bridge-mobile-1200.webp',
    srcMobileSet:
      '/media/editorial/pedestrian-bridge-mobile-800.webp 800w, /media/editorial/pedestrian-bridge-mobile-1200.webp 1200w',
    alt: 'John Seigenthaler Pedestrian Bridge at blue hour with downtown skyline and Cumberland River reflections.',
    credit: 'Nashville Convention & Visitors Corp',
    licence: 'CVC / Visit Music City — reference-only; not licensed; do not ship',
    width: 2400,
    height: 1350,
  },
  'attractions/country-music-hall-of-fame-night': {
    src: '/media/attractions/country-music-hall-of-fame-night-1600.webp',
    srcSet:
      '/media/attractions/country-music-hall-of-fame-night-640.webp 640w, /media/attractions/country-music-hall-of-fame-night-960.webp 960w, /media/attractions/country-music-hall-of-fame-night-1600.webp 1600w',
    srcMobile: '/media/attractions/country-music-hall-of-fame-night-mobile-960.webp',
    srcMobileSet:
      '/media/attractions/country-music-hall-of-fame-night-mobile-640.webp 640w, /media/attractions/country-music-hall-of-fame-night-mobile-960.webp 960w',
    alt: 'Blue-hour exterior of the Country Music Hall of Fame and Museum with the Omni Nashville Hotel visible.',
    credit: 'The Country Music Hall Of Fame and Museum',
    licence: 'Institution-authorized media',
    width: 1600,
    height: 1067,
  },
  'restaurants/peg-leg-porker': {
    src: '/media/restaurants/peg-leg-porker-1600.webp',
    srcSet:
      '/media/restaurants/peg-leg-porker-640.webp 640w, /media/restaurants/peg-leg-porker-960.webp 960w, /media/restaurants/peg-leg-porker-1600.webp 1600w',
    alt: 'Peg Leg Porker white-brick building, covered patio, and PEG LEG PORKER signage in the Gulch.',
    credit: 'Nashville Convention and Visitors Corp',
    licence: 'CVC / Visit Music City — reference-only; not licensed; do not ship',
    width: 1600,
    height: 1066,
  },
  'restaurants/butter-milk-ranch': {
    src: '/media/restaurants/butter-milk-ranch-1600.webp',
    srcSet:
      '/media/restaurants/butter-milk-ranch-640.webp 640w, /media/restaurants/butter-milk-ranch-960.webp 960w, /media/restaurants/butter-milk-ranch-1600.webp 1012w',
    alt: 'The Butter Milk Ranch restaurant and patio on 12th Avenue South in Nashville.',
    credit: 'Nashville Convention and Visitors Corp',
    licence: 'CVC / Visit Music City — reference-only; not licensed; do not ship',
    width: 1012,
    height: 675,
  },
  'restaurants/butchertown-hall': {
    src: '/media/restaurants/butchertown-hall-1600.webp',
    srcSet:
      '/media/restaurants/butchertown-hall-640.webp 640w, /media/restaurants/butchertown-hall-960.webp 960w, /media/restaurants/butchertown-hall-1600.webp 1500w',
    alt: 'Communal dining tables inside Butchertown Hall in Germantown.',
    credit: 'Butchertown Hall',
    licence: 'Official restaurant website media',
    width: 1500,
    height: 999,
  },
  'restaurants/aba-nashville': {
    src: '/media/restaurants/aba-nashville-1600.webp',
    srcSet:
      '/media/restaurants/aba-nashville-640.webp 640w, /media/restaurants/aba-nashville-960.webp 960w, /media/restaurants/aba-nashville-1600.webp 1200w',
    alt: 'The two-story dining room at Aba Nashville with olive trees and amber glass chandeliers.',
    credit: 'Aba / Lettuce Entertain You',
    licence: 'Official Aba Nashville website media',
    width: 1200,
    height: 800,
  },
  'restaurants/playdate': {
    src: '/media/restaurants/playdate-1600.webp',
    srcSet:
      '/media/restaurants/playdate-640.webp 640w, /media/restaurants/playdate-960.webp 960w, /media/restaurants/playdate-1600.webp 1012w',
    alt: "Playdate's outdoor patio with white umbrellas on 12th Avenue South.",
    credit: 'Nashville Convention and Visitors Corp',
    licence: 'CVC / Visit Music City — reference-only; not licensed; do not ship',
    width: 1012,
    height: 675,
  },
} as const satisfies Record<string, MediaAsset>;

/** Restored Commons keys override retired CVC / placeholder paths for the same key. */
export const images = {
  ...baseImages,
  ...restoredMedia,
  // Adobe purchase stubs only when the licensed file is present on disk.
  ...adobeReadyMedia,
} as const;

export type ImageKey = keyof typeof images;

const OWNED_AND_OPEN_BASE: readonly string[] = [
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
  'editorial/printers-alley',
  'editorial/private-events',
  'editorial/rooftop-party',
  'editorial/skyline',
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
  'hero/downtown-rooftop',
  'hero/live-music-night',
  'hero/lower-broadway',
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
  'venues/delux-weho-exterior',
  'venues/jbjs-food',
  'venues/jbjs-interior',
  'venues/jbjs-rooftop',
  'venues/the-lanes-homes',
  'downtown/sobro',
  'downtown/nashville-yards',
  'venues/roberts-western-world',
  'venues/chiefs-on-broadway',
  'venues/category-10',
  'restaurants/assembly-food-hall',
  'restaurants/bacco',
  'restaurants/etch',
  'restaurants/butchertown-hall',
  'restaurants/aba-nashville',
  'hotels/four-seasons-nashville',
  'hotels/1-hotel-nashville',
  'hotels/the-joseph',
  'hotels/grand-hyatt-nashville',
  'attractions/country-music-hall-of-fame-night',
];

/** Cleared hero keys stay allowlisted; uncleared hero stills stay gated. Hero video is the Pexels drone loop only. */
const CLEARED_OR_RESTORED = new Set<string>([
  'hero/video',
  ...OWNED_AND_OPEN_BASE,
  ...Object.keys(restoredMedia),
]);

const unclearedPresentKeys = TEMP_ALLOW_UNCLEARED_MEDIA
  ? (Object.keys(images) as ImageKey[]).filter((key) => {
      // Do not re-open uncleared hero stills; hero motion uses the Pexels drone loop.
      if (String(key).startsWith('hero/')) {
        return CLEARED_OR_RESTORED.has(key);
      }
      return true;
    })
  : [];

export const AVAILABLE_MEDIA: ReadonlySet<string> = new Set<string>(
  TEMP_ALLOW_UNCLEARED_MEDIA
    ? ['hero/video', ...unclearedPresentKeys]
    : [
        // Production gate: rightsStatus === 'cleared' && approvalStatus === 'approved'.
        // CVC / Visit Music City assets are never listed here.
        // Adobe purchase-required keys are intentionally omitted until licensed files land.
        ...OWNED_AND_OPEN_BASE,
        ...Object.keys(restoredMedia),
      ],
);

export function getImage(key: ImageKey | undefined): MediaAsset | undefined {
  return key ? images[key] : undefined;
}

export function isMediaClearedForProduction(key: string): boolean {
  /** AVAILABLE_MEDIA is the cleared+approved allowlist. */
  return AVAILABLE_MEDIA.has(key);
}

export function hasMedia(key: string): boolean {
  if (!isMediaClearedForProduction(key)) return false;
  const asset = images[key as ImageKey];
  return Boolean(asset?.src);
}

/** Build a listing ImageRef from a cleared media key (exact-place photography only). */
export function listingImageFromKey(key: ImageKey): import('./types').ImageRef | undefined {
  if (!hasMedia(key)) return undefined;
  const asset = images[key] as MediaAsset;
  return {
    src: asset.src,
    srcSet: asset.srcSet,
    alt: asset.alt,
    credit: asset.credit,
    width: asset.width,
    height: asset.height,
    focal: asset.focal,
  };
}
