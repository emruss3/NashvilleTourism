/**
 * NashRoam-owned tour editorial layer.
 * Separate from Viator commercial/product data (price, photos, ratings, URLs).
 *
 * This list is intentionally limited to formats with current Viator marketplace
 * inventory. A Nashville activity can still be editorially relevant without
 * being advertised here as a live-bookable Viator format.
 */

export interface TourEditorialRecommendation {
  slug: string;
  name: string;
  /** One line. What you are actually buying. */
  what: string;
  groupSize: string;
  /** Broad per-person planning range — never a live quote. */
  priceGuidance: string;
  bestFor: string;
  watchOut: string;
  /** Hint used to bias live Viator search / matching. */
  searchHint: string;
  editorialRank: number;
}

/** Stable editorial rankings — not derived from Viator sort order. */
export const TOUR_EDITORIAL: TourEditorialRecommendation[] = [
  {
    slug: 'party-bus',
    name: 'Party bus',
    what: 'An open-air or enclosed bus that loops downtown with music, usually BYOB, with a driver and a host.',
    groupSize: '10-30, sold by the seat or chartered whole',
    priceGuidance: 'Roughly $40-$85 per person for a shared ride; private charters are priced by the vehicle and the hour',
    bestFor: 'Bachelor and bachelorette groups, birthdays, anyone who wants the transport to be the activity',
    watchOut: 'Confirm the alcohol policy and whether coolers, ice, and cups are provided before you turn up with a case of beer.',
    searchHint: 'Party bus',
    editorialRank: 10,
  },
  {
    slug: 'honky-tonk-crawl',
    name: 'Honky-tonk crawl',
    what: 'A guided walk of several Lower Broadway bars with a host who handles the order and the timing.',
    groupSize: '10-25 on a shared crawl',
    priceGuidance: 'Roughly $30-$70 per person, drinks usually extra',
    bestFor: 'First-time visitors, solo travelers, small groups who do not want to plan the night',
    watchOut: 'Entry to the bars on Broadway is free anyway. You are paying for the guide, the queue skipping where it exists, and the pacing.',
    searchHint: 'Honky tonk bar crawl',
    editorialRank: 30,
  },
  {
    slug: 'whiskey-tasting',
    name: 'Whiskey tasting',
    what: 'A guided tasting at one distillery, or a van tour that strings several Tennessee distilleries together.',
    groupSize: '6-20, some tours cap smaller',
    priceGuidance: 'Roughly $50-$120 per person in town; full-day trips out to distilleries run higher',
    bestFor: 'Couples, groups who want a daytime activity, anyone tired of Broadway',
    watchOut: 'Day trips to distilleries outside the city can run six to eight hours door to door. Check the return time against your dinner plans.',
    searchHint: 'Whiskey distillery tour',
    editorialRank: 40,
  },
  {
    slug: 'city-sightseeing',
    name: 'City sightseeing',
    what: 'A bus, trolley, or amphibious vehicle circuit past the main landmarks with narration.',
    groupSize: '20-50, sold by the seat',
    priceGuidance: 'Roughly $35-$75 per person',
    bestFor: 'First morning in town, families, mixed-mobility groups, rainy days',
    watchOut: 'Hop-on-hop-off passes only pay off if you actually get off. If you plan to ride once, book a single loop.',
    searchHint: 'City sightseeing tour',
    editorialRank: 50,
  },
  {
    slug: 'live-music-tour',
    name: 'Live music tour',
    what: 'A guided route through music history sites, studios, or a set of venues, often with a working musician hosting.',
    groupSize: '8-25',
    priceGuidance: 'Roughly $40-$100 per person depending on whether venue admission is bundled',
    bestFor: 'Music-first trips, repeat visitors, anyone who wants context rather than a bar crawl',
    watchOut: 'Check whether studio interiors are included. Some routes only pass the buildings from outside.',
    searchHint: 'Nashville music history tour',
    editorialRank: 60,
  },
];

export function getTourEditorial(slug: string): TourEditorialRecommendation | undefined {
  return TOUR_EDITORIAL.find((t) => t.slug === slug);
}
