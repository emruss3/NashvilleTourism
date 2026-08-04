import Link from 'next/link';
import { Breadcrumbs, PageHeader, SectionHeader } from '@/components/Ui';
import { EventCard } from '@/components/Cards';
import { upcomingEvents } from '@/lib/content';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Nashville Events',
  description:
    'Concerts, festivals, and seasonal events in Nashville, with venue, neighborhood, ticket, and parking details for each.',
  path: '/events/',
});

export default function EventsIndex() {
  const events = upcomingEvents();
  const categories = Array.from(new Set(events.map((e) => e.category)));

  return (
    <div className="shell pb-16">
      <Breadcrumbs trail={[{ name: 'Events', href: '/events/' }]} />
      <PageHeader
        eyebrow="What's on"
        title="Nashville Events"
        intro="Concerts, festivals, and seasonal events. Check ticket links before you plan a night around any of them."
      />

      <div className="flex flex-wrap gap-2 py-6">
        <Link href="/events/this-weekend/" className="btn-primary">
          This weekend
        </Link>
        {categories.map((c) => (
          <span
            key={c}
            className="rounded-full border border-paper-edge bg-white px-4 py-1.5 text-sm text-ink-soft"
          >
            {c}
          </span>
        ))}
      </div>

      <section className="py-4">
        <SectionHeader title="Upcoming" description={`${events.length} events`} />
        <div className="grid gap-5 lg:grid-cols-2">
          {events.map((e) => (
            <EventCard key={e.slug} item={e} />
          ))}
        </div>
      </section>
    </div>
  );
}
