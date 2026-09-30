/**
 * Guest reviews and the provider's sentiment summary for one hotel, as the
 * pages read them. Pure mapping only (tested without the Next.js alias);
 * the fetch is `getHotelReviews` in `src/lib/feeds/hotel-rooms.ts`.
 *
 * Display rules: the score is the provider's 0 to 10 guest score, shown
 * with its review count and never as our own rating; reviews are quoted
 * as guest opinion with first name, traveller type and month; nothing is
 * summarised in our voice.
 */

export type TravellerType = 'family' | 'couple' | 'solo' | 'friends' | 'group' | 'business' | 'other';

export interface GuestReview {
  score?: number;
  name?: string;
  country?: string;
  type?: TravellerType;
  date?: string;
  headline?: string;
  language?: string;
  pros?: string;
  cons?: string;
}

export interface SentimentCategory {
  name: string;
  rating: number;
  description?: string;
}

export interface ReviewSentiment {
  totalReviews?: number;
  pros: string[];
  cons: string[];
  categories: SentimentCategory[];
}

export interface HotelReviews {
  reviews: GuestReview[];
  sentiment?: ReviewSentiment;
  reviewCount: number;
  providerTotal?: number;
}

const TYPES = new Set<string>(['family', 'couple', 'solo', 'friends', 'group', 'business', 'other']);

export const TRAVELLER_LABEL: Record<TravellerType, string> = {
  family: 'Family',
  couple: 'Couple',
  solo: 'Solo traveller',
  friends: 'Friends',
  group: 'Group',
  business: 'Business trip',
  other: 'Guest',
};

function num(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}
function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

export function mapReview(raw: Record<string, unknown>): GuestReview | undefined {
  const pros = str(raw.pros);
  const cons = str(raw.cons);
  const headline = str(raw.headline);
  if (!pros && !cons && !headline) return undefined;
  const type = str(raw.type);
  const name = str(raw.name);
  return {
    score: num(raw.score),
    // Review-site handles ("Discover06583037743") are not names; show "Guest" instead.
    name: name && !/\d/.test(name) && name.length <= 20 ? name : undefined,
    country: str(raw.country),
    type: type && TYPES.has(type) ? (type as TravellerType) : undefined,
    date: str(raw.date),
    headline,
    language: str(raw.language),
    pros,
    cons,
  };
}

export function mapReviews(raw: Record<string, unknown> | null | undefined): HotelReviews | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const reviews = (Array.isArray(raw.reviews) ? raw.reviews : []).map((r) => mapReview(r as Record<string, unknown>)).filter((r): r is GuestReview => Boolean(r));
  const sa = raw.sentiment as Record<string, unknown> | null | undefined;
  const sentiment: ReviewSentiment | undefined =
    sa && typeof sa === 'object'
      ? {
          totalReviews: num(sa.totalReviews),
          pros: (Array.isArray(sa.pros) ? sa.pros : []).map(String).filter(Boolean),
          cons: (Array.isArray(sa.cons) ? sa.cons : []).map(String).filter(Boolean),
          categories: (Array.isArray(sa.categories) ? sa.categories : [])
            .map((c) => c as Record<string, unknown>)
            .filter((c) => str(c.name) && num(c.rating) !== undefined)
            .map((c) => ({ name: String(c.name), rating: num(c.rating)!, description: str(c.description) })),
        }
      : undefined;
  if (!reviews.length && !sentiment) return undefined;
  return { reviews, sentiment, reviewCount: reviews.length, providerTotal: num(raw.providerTotal) };
}

/** "Sep 2026" from an ISO-ish date; the raw string when it will not parse. */
export function reviewMonth(date?: string): string | undefined {
  if (!date) return undefined;
  const t = Date.parse(date);
  if (!Number.isFinite(t)) return date.slice(0, 10);
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(t));
}

/** Provider scores are 0 to 10 with one decimal; category ratings may come 0 to 10 or 0 to 100. */
export function scoreOutOfTen(value: number): number {
  return value > 10 ? Math.round(value) / 10 : Math.round(value * 10) / 10;
}

/** A plain-English word for a 0 to 10 guest score. */
export function scoreWord(score: number): string {
  if (score >= 9) return 'Exceptional';
  if (score >= 8) return 'Very good';
  if (score >= 7) return 'Good';
  if (score >= 6) return 'Fair';
  return 'Mixed';
}
