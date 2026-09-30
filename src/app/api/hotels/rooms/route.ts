import { getHotelRooms } from '@/lib/feeds/hotel-rooms';
import { resolveStayDates } from '@/lib/stay-dates';
import { MAX_STAY_ADULTS } from '@/lib/stay-links';

export const dynamic = 'force-dynamic';

const HOTEL_ID = /^lp[a-z0-9]{3,16}$/;

/**
 * Room options for one hotel, for the room list that loads on the hotel
 * pages. Server side so the service role stays server side; the edge
 * function caches the provider answer an hour per hotel, dates and party.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const hotelId = url.searchParams.get('hotelId') ?? '';
  if (!HOTEL_ID.test(hotelId)) return Response.json({ ok: false, error: 'hotelId required' }, { status: 400 });
  const dates = resolveStayDates(url.searchParams.get('checkin') ?? undefined, url.searchParams.get('checkout') ?? undefined);
  const adultsRaw = Number(url.searchParams.get('adults') ?? 2);
  const adults = Number.isInteger(adultsRaw) ? Math.min(Math.max(adultsRaw, 1), MAX_STAY_ADULTS) : 2;

  const result = await getHotelRooms({ hotelId, checkin: dates.checkin, checkout: dates.checkout, adults, campaign: 'hotels-rooms' });
  if (!result.live) {
    return Response.json({ ok: false, error: result.error ?? 'unavailable', environment: result.environment }, { status: result.httpStatus === 503 ? 503 : 502 });
  }
  return Response.json(
    {
      ok: true,
      hotelId,
      checkin: dates.checkin,
      checkout: dates.checkout,
      adults,
      cached: result.cached,
      environment: result.environment,
      fetchedAt: result.fetchedAt,
      expiresAt: result.expiresAt,
      attribution: result.attribution,
      canDisplayRating: result.canDisplayRating,
      rateCount: result.rateCount,
      hotel: result.detail ? { name: result.detail.name, images: result.detail.images.slice(0, 6), checkinTime: result.detail.checkinTime, checkoutTime: result.detail.checkoutTime } : null,
      groups: result.groups,
    },
    { headers: { 'cache-control': 'private, max-age=0, must-revalidate' } },
  );
}
