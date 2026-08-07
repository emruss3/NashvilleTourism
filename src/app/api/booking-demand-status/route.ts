import { getBookingDemandStatus } from '@/lib/feeds/booking-demand';

/** Hotel Demand API health — never returns credentials. */
export const dynamic = 'force-dynamic';

export async function GET() {
  const status = await getBookingDemandStatus();
  return Response.json(
    {
      provider: 'booking_demand',
      ...status,
      notes: [
        'Hotels are not sourced from Viator.',
        'Sample /hotels pages are placeholder catalog, not production inventory.',
        'Google Places may supplement maps/hours/ratings but is not the booking source.',
      ],
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
