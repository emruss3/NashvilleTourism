/**
 * Structured content models.
 *
 * Every listing carries provenance fields (`dateChecked`, `sourceNote`,
 * `dataStatus`) so the UI can always tell the reader how current a detail is
 * and whether it has been verified by a human. Nothing renders as fact
 * unless it has been marked verified.
 */

export type DataStatus =
  | 'verified' // A person confirmed this against a primary source.
  | 'unverified' // Placeholder shape for the template. Must be checked before publishing.
  | 'needs-recheck'; // Was verified once, but the check window has lapsed.

export type PriceRange = '$' | '$$' | '$$$' | '$$$$';

export type PlacementType =
  | 'editorial' // Chosen by the desk. Never paid.
  | 'sponsored' // Paid placement.
  | 'affiliate'; // Editorial pick that also carries a commission link.

export type NeighborhoodSlug =
  | 'downtown-broadway'
  | '12-south'
  | 'the-gulch'
  | 'east-nashville'
  | 'germantown'
  | 'wedgewood-houston'
  | 'midtown'
  | 'hillsboro-village'
  | 'sylvan-park'
  | 'green-hills';

/** Fields shared by every piece of content we publish. */
export interface ContentBase {
  slug: string;
  title: string;
  /** One-sentence editorial summary. Plain, specific, no hype. */
  summary: string;
  dataStatus: DataStatus;
  /** ISO date a human last checked the practical details. */
  dateChecked: string;
  /** ISO date the written content last changed. */
  dateUpdated?: string;
  /** Where the practical details came from. Shown in the CMS, not the page. */
  sourceNote?: string;
  placement: PlacementType;
  /** Required when placement is 'sponsored'. */
  sponsorName?: string;
  image?: ImageRef;
}

export interface ImageRef {
  /** Local path or remote URL. */
  src: string;
  /** Required. Describes the photo for screen readers. */
  alt: string;
  credit?: string;
  /** Intrinsic size for layout reservation / CLS. */
  width?: number;
  height?: number;
  focal?: 'center' | 'top' | 'bottom';
}

export interface Author {
  slug: string;
  name: string;
  role: string;
  bio: string;
  /** Years living in or covering Nashville. */
  basedIn: string;
  email?: string;
  covers: string[];
}

export interface Restaurant extends ContentBase {
  kind: 'restaurant';
  whyWeRecommend: string;
  cuisine: string;
  neighborhood: NeighborhoodSlug;
  priceRange: PriceRange;
  bestFor: string[];
  address: string;
  hoursNote: string;
  reservationUrl?: string;
  reservationPlatform?: string;
  mapQuery: string;
  parkingNote: string;
  dressCode: string;
  goodForGroups: boolean;
  outdoorSeating: boolean;
  relatedSlugs: string[];
}

export interface Hotel extends ContentBase {
  kind: 'hotel';
  whyWeRecommend: string;
  neighborhood: NeighborhoodSlug;
  priceCategory: PriceRange;
  bestFor: string[];
  address: string;
  amenities: string[];
  parkingNote: string;
  hasPool: boolean;
  hasFitness: boolean;
  familyFriendly: boolean;
  /** 0-100. Our own read on how much you can do without a car. */
  walkabilityNote: string;
  nearbyAttractions: string[];
  bookingUrl?: string;
  mapQuery: string;
  relatedSlugs: string[];
}

export interface NashvilleEvent extends ContentBase {
  kind: 'event';
  /** ISO date. */
  startDate: string;
  endDate?: string;
  timeNote: string;
  venue: string;
  neighborhood: NeighborhoodSlug;
  category: EventCategory;
  description: string;
  ticketNote: string;
  ticketUrl?: string;
  priceNote: string;
  ageRestriction: string;
  parkingNote: string;
  mapQuery: string;
  relatedSlugs: string[];
}

export type EventCategory =
  | 'Concert'
  | 'Festival'
  | 'Sports'
  | 'Theater'
  | 'Food & Drink'
  | 'Free'
  | 'Family';

export interface Venue extends ContentBase {
  kind: 'venue';
  whyWeRecommend: string;
  neighborhood: NeighborhoodSlug;
  capacityNote: string;
  genres: string[];
  coverNote: string;
  address: string;
  mapQuery: string;
  relatedSlugs: string[];
}

export interface Attraction extends ContentBase {
  kind: 'attraction';
  whyWeRecommend: string;
  neighborhood: NeighborhoodSlug;
  category: string;
  priceNote: string;
  timeNeeded: string;
  bestFor: string[];
  address: string;
  mapQuery: string;
  indoor: boolean;
  familyFriendly: boolean;
  relatedSlugs: string[];
}

export interface Neighborhood {
  slug: NeighborhoodSlug;
  name: string;
  summary: string;
  /** Longer editorial orientation, 2-3 paragraphs. */
  overview: string[];
  bestFor: string[];
  /** Clear tradeoffs — when this area is a poor fit. */
  avoidIf: string[];
  knownFor: string[];
  /** Short editorial walkability note for decision panels. */
  walkability: string;
  nightlifeLevel: 'Low' | 'Moderate' | 'High' | 'Very high';
  noiseLevel: string;
  /** Typical travel time to Lower Broadway. */
  broadwayMinutes: { walk?: number; drive: number };
  /** Rough hotel band for visitor planning — not a live rate. */
  typicalHotelPrice: string;
  landmarks: string[];
  gettingThere: string;
  parkingNote: string;
  halfDayItinerary: { time: string; activity: string; note: string }[];
  mapQuery: string;
  dateChecked: string;
  image?: ImageRef;
}

export interface GuideSection {
  heading: string;
  /** Paragraphs of editorial copy. */
  body: string[];
  /** Optional listing slugs to render as cards inside the section. */
  picks?: string[];
}

export interface Guide extends ContentBase {
  kind: 'guide';
  /** The direct answer, shown above the fold. */
  shortAnswer: string;
  cluster: GuideCluster;
  authorSlug: string;
  editorSlug?: string;
  datePublished: string;
  intro: string[];
  sections: GuideSection[];
  faqs: { question: string; answer: string }[];
  relatedSlugs: string[];
  readingTimeMinutes: number;
}

export type GuideCluster =
  | 'Restaurants'
  | 'Hotels'
  | 'Things to Do'
  | 'Trip Planning'
  | 'Events'
  | 'Music';

export type Listing = Restaurant | Hotel | NashvilleEvent | Venue | Attraction;

/** Shape used by the search index and every card component. */
export interface SearchDoc {
  slug: string;
  href: string;
  title: string;
  summary: string;
  type: 'Restaurant' | 'Hotel' | 'Event' | 'Venue' | 'Attraction' | 'Guide' | 'Neighborhood';
  neighborhood?: string;
  keywords: string[];
}

/* ---------------------------------- Trip planner ---------------------------------- */

export type TripType =
  | 'first-visit'
  | 'couples'
  | 'friends'
  | 'bachelor'
  | 'bachelorette'
  | 'family'
  | 'business'
  | 'music'
  | 'food';

export type Pace = 'relaxed' | 'balanced' | 'packed';
export type Budget = 'value' | 'moderate' | 'premium';

export interface TripInput {
  startDate: string;
  endDate: string;
  travelers: number;
  tripType: TripType;
  interests: string[];
  neighborhoods: NeighborhoodSlug[];
  budget: Budget;
  pace: Pace;
  needsHotel: boolean;
  wantsNightlife: boolean;
  hasChildren: boolean;
}

export interface ItineraryStop {
  slot: 'Morning' | 'Lunch' | 'Afternoon' | 'Dinner' | 'Evening';
  title: string;
  href?: string;
  neighborhood: string;
  note: string;
  /** Practical guidance, e.g. "Book 3-4 weeks out". */
  reservationNote?: string;
  travelNote?: string;
  mapQuery: string;
  alternatives: { title: string; href?: string; note: string }[];
}

export interface ItineraryDay {
  dayNumber: number;
  date: string;
  theme: string;
  stops: ItineraryStop[];
}
