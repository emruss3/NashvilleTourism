import { STAY_PARTNER, clientReference, stayHotelHref, type StayLinkOptions } from '@/lib/stay-links';
import type { Hotel } from '@/lib/types';

export type HotelBookingPlacement = 'whitelabel' | 'affiliate';

export interface HotelBookingLink {
  /** Undefined only when there is neither a white-label link nor a fallback. */
  url?: string;
  partner: string;
  placement: HotelBookingPlacement;
  clientReference: string;
  hotelId?: string;
}

/**
 * The one way any surface links a hotel to a booking. White-label hotel page
 * when the host and the hotel's LiteAPI id are both known; otherwise the
 * hotel's affiliate/search fallback. Never both.
 */
export function hotelBookingHref(
  hotel: Pick<Hotel, 'slug' | 'liteApiHotelId' | 'fallbackUrl'>,
  opts: Omit<StayLinkOptions, 'clientReference'> & { surface?: string } = {},
): HotelBookingLink {
  const reference = clientReference(opts.surface ?? 'hotel', hotel.slug);
  const { surface: _surface, ...linkOpts } = opts;
  const whitelabel = hotel.liteApiHotelId ? stayHotelHref(hotel.liteApiHotelId, { ...linkOpts, clientReference: reference }) : undefined;
  if (whitelabel) {
    return { url: whitelabel, partner: STAY_PARTNER, placement: 'whitelabel', clientReference: reference, hotelId: hotel.liteApiHotelId };
  }
  return { url: hotel.fallbackUrl, partner: 'Booking.com', placement: 'affiliate', clientReference: reference, hotelId: hotel.liteApiHotelId };
}

export interface HotelSearchParams {
  checkin?: string;
  checkout?: string;
  adults?: number;
  neighborhood?: string;
  /** Marketplace filters (docs/HOTEL-BOOKING.md). */
  stars?: number;
  max?: number;
  refundable?: boolean;
  type?: 'hotel' | 'rental';
}

/** On-site marketplace URL with the search carried in the query. */
export function hotelSearchPath(params: HotelSearchParams = {}, hash?: string): string {
  const u = new URLSearchParams();
  if (params.checkin) u.set('checkin', params.checkin);
  if (params.checkout) u.set('checkout', params.checkout);
  if (params.adults) u.set('adults', String(params.adults));
  if (params.neighborhood) u.set('neighborhood', params.neighborhood);
  if (params.stars) u.set('stars', String(params.stars));
  if (params.max) u.set('max', String(params.max));
  if (params.refundable) u.set('refundable', '1');
  if (params.type) u.set('type', params.type);
  const qs = u.toString();
  return `${qs ? `/hotels/?${qs}` : '/hotels/'}${hash ? `#${hash}` : ''}`;
}
