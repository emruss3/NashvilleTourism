import { site } from '@/lib/site';
import { getCalendar } from '@/lib/feeds/calendar';
import { canonical } from '@/lib/seo';

export const dynamic = 'force-static';

/** Machine-readable event calendar, mirroring what /live-music-tonight/ renders. */
export async function GET() {
  const { events, live, fetchedAt } = await getCalendar();

  return Response.json(
    {
      publisher: { name: site.name, url: canonical('/') },
      source: live ? 'ticketmaster' : 'seed',
      note: live
        ? 'Event data supplied by Ticketmaster. Confirm with the venue before acting.'
        : 'Demonstration data. No live events feed is connected to this build.',
      generatedAt: fetchedAt,
      count: events.length,
      events: events.map((e) => ({
        id: e.id,
        name: e.name,
        startDate: e.date,
        startTime: e.time ?? null,
        venue: e.venue,
        city: e.city,
        genre: e.genre ?? null,
        priceFrom: e.priceFrom ?? null,
        currency: e.currency ?? null,
        ticketUrl: e.ticketUrl,
        source: e.source,
      })),
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=1800',
        'Access-Control-Allow-Origin': '*',
      },
    },
  );
}
