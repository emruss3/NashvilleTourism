import Link from 'next/link';
import { Breadcrumbs, EmptyState, PageHeader, SectionHeader } from '@/components/Ui';
import { EventCard } from '@/components/Cards';
import { upcomingEvents } from '@/lib/content';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Nashville Events This Weekend',
  description:
    'What is on in Nashville this weekend: concerts, festivals, and free events, with venues, neighborhoods, and ticket guidance.',
  path: '/events/this-weekend/',
});

/**
 * Static export means "this weekend" cannot be computed per-request. We show
 * the soonest events and state the build date rather than implying live data.
 */
export default function ThisWeekendPage() {
  const soon = upcomingEvents(6);

  return (
    <div className="shell pb-16">
      <Breadcrumbs
        trail={[
          { name: 'Events', href: '/events/' },
          { name: 'This weekend', href: '/events/this-weekend/' },
        ]}
      />
      <PageHeader
        eyebrow="This weekend"
        title="Nashville Events This Weekend"
        intro="The soonest events on our calendar. Confirm dates and tickets with the venue before you build a night around one."
      />

      <div className="mt-6 rounded border border-paper-edge bg-paper-sunk p-4 text-sm text-ink-soft">
        This page is generated at build time. Connect an events feed to make the weekend window
        update on its own.
      </div>

      <section className="py-8">
        <SectionHeader title="Soonest events" />
        {soon.length === 0 ? (
          <EmptyState
            title="Nothing on the calendar yet"
            description="We have not published events for this window. Check the full events index or come back closer to the weekend."
            action={
              <Link href="/events/" className="btn-primary">
                All events
              </Link>
            }
          />
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {soon.map((e) => (
              <EventCard key={e.slug} item={e} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
