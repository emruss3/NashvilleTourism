/**
 * Third-party review adapter.
 *
 * IMPORTANT LICENSING NOTES, because this is the part that gets sites in
 * trouble:
 *
 * - Google Places API returns at most 5 reviews per place. Its terms require
 *   attribution to Google, forbid caching most Places data for more than 30
 *   days, and forbid displaying it alongside a competing map provider. Reviews
 *   must link back to the Google listing.
 * - TripAdvisor's Content API requires an approved partner account. It permits
 *   a rating image and up to a short snippet, and mandates their branding plus
 *   a link to the full listing. It does NOT permit reproducing full review text.
 *
 * Consequently this adapter fetches at build time, stores nothing beyond the
 * build, and the display component always renders the required attribution.
 * Never present third-party ratings as our own editorial verdict.
 */

export interface ExternalReviewSummary {
  /** Which service supplied this. Always shown to the reader. */
  provider: 'google' | 'tripadvisor';
  /** Average rating as supplied. We never compute or adjust it. */
  rating: number;
  ratingScale: 5;
  reviewCount: number;
  /** Deep link to the provider's own listing. Required by both providers. */
  listingUrl: string;
  /** Short quotes only, where the licence allows it. */
  snippets: { author: string; text: string; rating: number; relativeTime: string }[];
  fetchedAt: string;
}

interface GooglePlaceResponse {
  result?: {
    rating?: number;
    user_ratings_total?: number;
    url?: string;
    reviews?: {
      author_name?: string;
      rating?: number;
      text?: string;
      relative_time_description?: string;
    }[];
  };
  status?: string;
}

/**
 * Fetches a Google Places rating summary for one place id.
 * Returns null when unconfigured or on any failure, so callers degrade to
 * showing nothing rather than showing something invented.
 */
export async function fetchGoogleReviews(placeId: string): Promise<ExternalReviewSummary | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key || !placeId) return null;

  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  url.searchParams.set('place_id', placeId);
  url.searchParams.set('fields', 'rating,user_ratings_total,url,reviews');
  url.searchParams.set('key', key);

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = (await res.json()) as GooglePlaceResponse;
    const r = json.result;
    if (!r?.rating || !r.url) return null;

    return {
      provider: 'google',
      rating: r.rating,
      ratingScale: 5,
      reviewCount: r.user_ratings_total ?? 0,
      listingUrl: r.url,
      snippets: (r.reviews ?? []).slice(0, 3).map((rev) => ({
        author: rev.author_name ?? 'Google user',
        // Trimmed to a snippet. Do not reproduce full review bodies.
        text: (rev.text ?? '').slice(0, 240),
        rating: rev.rating ?? 0,
        relativeTime: rev.relative_time_description ?? '',
      })),
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * TripAdvisor Content API location details.
 * Requires an approved partner key. Snippets are intentionally omitted because
 * the standard licence does not grant rights to reproduce review text.
 */
export async function fetchTripAdvisorRating(locationId: string): Promise<ExternalReviewSummary | null> {
  const key = process.env.TRIPADVISOR_API_KEY;
  if (!key || !locationId) return null;

  const url = new URL(
    `https://api.content.tripadvisor.com/api/v1/location/${encodeURIComponent(locationId)}/details`,
  );
  url.searchParams.set('key', key);
  url.searchParams.set('language', 'en');

  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      rating?: string | number;
      num_reviews?: string | number;
      web_url?: string;
    };
    if (!json.rating || !json.web_url) return null;

    return {
      provider: 'tripadvisor',
      rating: Number(json.rating),
      ratingScale: 5,
      reviewCount: Number(json.num_reviews ?? 0),
      listingUrl: json.web_url,
      snippets: [],
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export const REVIEWS_CONFIGURED = Boolean(
  process.env.GOOGLE_PLACES_API_KEY || process.env.TRIPADVISOR_API_KEY,
);
