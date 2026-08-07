/**
 * Booking.com Demand API hotel-provider adapter (scaffold).
 *
 * Hotels are NOT sourced from Viator. Until Demand API credentials exist,
 * this module returns a graceful unconfigured/fallback state. Google Places
 * may supplement maps/hours/ratings later but must not become booking inventory.
 *
 * Env (server-only, when issued):
 *   BOOKING_DEMAND_API_KEY
 *   BOOKING_DEMAND_AFFILIATE_ID (optional)
 */

export interface HotelProviderPhoto {
  url: string;
  caption?: string;
}

export interface HotelProviderReviewSnippet {
  /** Only when Demand API terms permit displaying review text. */
  text?: string;
  rating?: number;
  author?: string;
}

export interface HotelProviderListing {
  provider: 'booking_demand';
  providerHotelId: string;
  name: string;
  neighborhoodHint?: string;
  photos: HotelProviderPhoto[];
  rating?: number;
  reviewCount?: number;
  permittedReviews?: HotelProviderReviewSnippet[];
  amenities: string[];
  rooms?: { name: string; maxOccupancy?: number }[];
  fromRate?: { amount: number; currency: string; formatted: string };
  availability?: 'available' | 'limited' | 'unavailable' | 'unknown';
  /** Use Demand API booking URL exactly when present. */
  bookingUrl?: string;
}

export interface HotelProviderCatalog {
  configured: boolean;
  live: boolean;
  listings: HotelProviderListing[];
  fetchedAt: string;
  error?: string;
  /** NashRoam sample catalog must not be treated as production inventory. */
  fallbackMode: 'unconfigured' | 'error' | 'live';
  attribution: string;
}

function demandKey(): string | undefined {
  return process.env.BOOKING_DEMAND_API_KEY?.trim() || undefined;
}

export function isBookingDemandConfigured(): boolean {
  return Boolean(demandKey());
}

/**
 * Live Nashville hotel search via Booking.com Demand API.
 * Returns graceful fallback until credentials and endpoint access are confirmed.
 */
export async function searchNashvilleHotels(_params: {
  checkin?: string;
  checkout?: string;
  adults?: number;
  area?: string;
} = {}): Promise<HotelProviderCatalog> {
  const fetchedAt = new Date().toISOString();
  if (!isBookingDemandConfigured()) {
    return {
      configured: false,
      live: false,
      listings: [],
      fetchedAt,
      fallbackMode: 'unconfigured',
      error: 'BOOKING_DEMAND_API_KEY missing — hotel inventory stays in graceful fallback',
      attribution:
        'Hotel booking will use Booking.com Demand API when credentials are available. Sample hotel pages are not live inventory.',
    };
  }

  // Credentials exist but the Demand API client surface is account-specific.
  // Keep a hard fail-soft until the approved endpoint contract is wired.
  return {
    configured: true,
    live: false,
    listings: [],
    fetchedAt,
    fallbackMode: 'error',
    error:
      'Booking.com Demand API key is present but the production endpoint adapter is not yet enabled for this account.',
    attribution: 'Booking.com Demand API (pending endpoint enablement).',
  };
}

export async function getBookingDemandStatus(): Promise<{
  configured: boolean;
  live: boolean;
  fallbackMode: HotelProviderCatalog['fallbackMode'];
  message: string;
}> {
  const catalog = await searchNashvilleHotels();
  return {
    configured: catalog.configured,
    live: catalog.live,
    fallbackMode: catalog.fallbackMode,
    message: catalog.error || 'ok',
  };
}
