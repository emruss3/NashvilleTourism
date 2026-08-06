import { getCalendar } from '@/lib/feeds/calendar';

/** Safe health snapshot for the Ticketmaster integration; exposes no credential. */
export const revalidate = 1800;

export async function GET() {
  const calendar = await getCalendar();
  const ticketmasterEvents = calendar.events.filter((event) => event.source === 'ticketmaster');
  const cities = Array.from(new Set(ticketmasterEvents.map((event) => event.city))).sort();
  const states = Array.from(
    new Set(ticketmasterEvents.map((event) => event.stateCode).filter(Boolean) as string[]),
  ).sort();

  return Response.json(
    {
      configured: calendar.configured,
      live: calendar.live,
      source: calendar.live ? 'ticketmaster' : 'fallback',
      eventCount: ticketmasterEvents.length,
      allEventsAreNashville:
        ticketmasterEvents.length > 0 &&
        ticketmasterEvents.every(
          (event) => event.city.toLowerCase() === 'nashville' && (!event.stateCode || event.stateCode === 'TN'),
        ),
      cities,
      states,
      sampleVenues: ticketmasterEvents.slice(0, 5).map((event) => event.venue),
      fetchedAt: calendar.fetchedAt,
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=300',
      },
    },
  );
}
