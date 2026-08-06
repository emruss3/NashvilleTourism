import { getCalendar } from '@/lib/feeds/calendar';

/**
 * Build-time health snapshot for the Ticketmaster feed.
 * This intentionally exposes no credentials or request details.
 */
export const dynamic = 'force-static';

export async function GET() {
  const calendar = await getCalendar();
  const ticketmasterEvents = calendar.events.filter((event) => event.source === 'ticketmaster');

  return Response.json(
    {
      configured: calendar.configured,
      live: calendar.live,
      source: calendar.live ? 'ticketmaster' : 'fallback',
      eventCount: ticketmasterEvents.length,
      fetchedAt: calendar.fetchedAt,
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    },
  );
}
