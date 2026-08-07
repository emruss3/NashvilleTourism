/**
 * Provider provenance helpers for the NashRoam data platform.
 * Maps live provider IDs without copying volatile fields into editorial columns.
 */

export const PROVIDER_KEYS = {
  viator: 'viator',
  bookingDemand: 'booking_demand',
  googlePlaces: 'google_places',
  nashroamEditorial: 'nashroam_editorial',
} as const;

export type ProviderKey = (typeof PROVIDER_KEYS)[keyof typeof PROVIDER_KEYS];

export interface ProviderProvenance {
  providerKey: ProviderKey;
  externalId: string;
  /** Optional secondary IDs (destination, property, etc.). */
  secondaryIds?: Record<string, string>;
  fetchedAt: string;
  /** Volatile fields owned by the provider — do not mirror into editorial. */
  volatileFields: string[];
}

export function viatorProvenance(productCode: string, fetchedAt: string): ProviderProvenance {
  return {
    providerKey: PROVIDER_KEYS.viator,
    externalId: productCode,
    secondaryIds: { destinationId: '799' },
    fetchedAt,
    volatileFields: [
      'price',
      'availability',
      'photos',
      'rating',
      'reviewCount',
      'productUrl',
      'operatingStatus',
    ],
  };
}

export function bookingDemandProvenance(hotelId: string, fetchedAt: string): ProviderProvenance {
  return {
    providerKey: PROVIDER_KEYS.bookingDemand,
    externalId: hotelId,
    fetchedAt,
    volatileFields: [
      'photos',
      'rating',
      'reviewCount',
      'reviews',
      'amenities',
      'rooms',
      'rates',
      'availability',
      'bookingUrl',
    ],
  };
}
