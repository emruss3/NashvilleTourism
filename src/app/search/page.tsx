import { Suspense } from 'react';
import { Breadcrumbs, LoadingState, PageHeader } from '@/components/Ui';
import SearchClient from './SearchClient';
import { getCalendar } from '@/lib/feeds/calendar';
import type { SearchDoc } from '@/lib/types';
import { buildMetadata } from '@/lib/seo';

export const revalidate = 1800;

export const metadata = buildMetadata({
  title: 'Search',
  description: 'Search restaurants, hotels, current Nashville events, neighborhoods, and guides.',
  path: '/search/',
  noindex: true,
});

export default async function SearchPage() {
  const calendar = await getCalendar();
  const liveEventDocs: SearchDoc[] = calendar.live
    ? calendar.events.map((event) => ({
        slug: `ticketmaster-${event.id}`,
        href: event.ticketUrl,
        title: event.name,
        summary: `${event.date} · ${event.venue}${event.time ? ` · ${event.time}` : ''}`,
        type: 'Event',
        neighborhood: 'Nashville',
        keywords: [
          event.segment,
          event.genre,
          event.subGenre,
          event.venue,
          'event',
          'tickets',
          'this weekend',
          'nashville',
        ].filter(Boolean) as string[],
      }))
    : [];

  return (
    <div className="shell pb-16">
      <Breadcrumbs trail={[{ name: 'Search', href: '/search/' }]} />
      <PageHeader title="Search" intro="Restaurants, hotels, live events, venues, neighborhoods, and guides." />
      <div className="py-8">
        <Suspense fallback={<LoadingState label="Loading search" />}>
          <SearchClient liveEventDocs={liveEventDocs} />
        </Suspense>
      </div>
    </div>
  );
}
