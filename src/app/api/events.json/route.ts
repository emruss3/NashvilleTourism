import { site } from '@/lib/site';
import { getCalendar } from '@/lib/feeds/calendar';
import { canonical } from '@/lib/seo';

export const revalidate = 1800;

/** Machine-readable Nashville event calendar, using the same source as the UI. */
export async function GET() {
  const { events, live, fetchedAt } = await getCalendar();

  return Response.json(
    {
      publisher: { name: site.name, url: canonical('/') },
      source: live ? 'ticketmaster' : 'seed',
      locationPolicy: 'Only events with a venue explicitly located in Nashville, Tennessee are published from Ticketmaster.',
      note: live
        ? 'Event data supplied by Ticketmaster. Confirm with the venue before acting.'
        : 'Demonstration data. No usable live Nashville event feed was returned.',
      generatedAt: fetchedAt,
      count: events.length,
      events: events.map((event) => ({
        id: event.id,
        name: event.name,
        startDate: event.date,
        startTime: event.time ?? null,
        venue: event.venue,
        city: event.city,
        stateCode: event.stateCode ?? null,
        segment: event.segment ?? null,
        genre: event.genre ?? null,
        subGenre: event.subGenre ?? null,
        priceFrom: event.priceFrom ?? null,
        currency: event.currency ?? null,
        ticketUrl: event.ticketUrl,
        imageUrl: event.imageUrl ?? null,
        imageIsFallback: event.imageIsFallback ?? null,
        source: event.source,
        onSaleStatus: event.onSaleStatus ?? null,
      })),
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=300',
        'Access-Control-Allow-Origin': '*',
      },
    },
  );
}
