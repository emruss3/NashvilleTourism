import Link from 'next/link';
import { Breadcrumbs, EmptyState, PageHeader, SectionHeader } from '@/components/Ui';
import LiveEventCard from '@/components/LiveEventCard';
import { getCalendar } from '@/lib/feeds/calendar';
import { buildMetadata } from '@/lib/seo';

export const revalidate = 1800;

export const metadata = buildMetadata({
  title: 'Nashville Events This Weekend',
  description:
    'What is on in Nashville this weekend: current concerts, sports, theater, and ticketed events at Nashville venues.',
  path: '/events/this-weekend/',
});

function nashvilleToday(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function shiftDate(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function weekendWindow(today: string): { friday: string; sunday: string } {
  const date = new Date(`${today}T12:00:00Z`);
  const day = date.getUTCDay();
  const fridayOffset = day === 6 ? -1 : day === 0 ? -2 : 5 - day;
  const friday = shiftDate(today, fridayOffset);
  return { friday, sunday: shiftDate(friday, 2) };
}

export default async function ThisWeekendPage() {
  const today = nashvilleToday();
  const { friday, sunday } = weekendWindow(today);
  const { events, live, configured } = await getCalendar({
    startDate: friday,
    endDate: sunday,
  });

  return (
    <div className="shell pb-16">
      <Breadcrumbs
        trail={[
          { name: 'Events', href: '/events/' },
          { name: 'This weekend', href: '/events/this-weekend/' },
        ]}
      />
      <PageHeader
        eyebrow="Friday to Sunday"
        title="Nashville Events This Weekend"
        intro="Current Ticketmaster listings at Nashville venues only. Confirm final times and ticket availability before you go."
      />

      {!live && (
        <div className="mt-6 rounded border border-clay/20 bg-paper-card p-4 text-sm text-clay-deep">
          <strong className="font-semibold">Ticketmaster feed is not live for this weekend.</strong>{' '}
          {configured
            ? 'No verified Nashville-city events came back for this window, so fallback records are shown when available.'
            : 'Add TICKETMASTER_API_KEY in Vercel to activate current event listings.'}
        </div>
      )}

      <section className="py-8">
        <SectionHeader title={`${friday} through ${sunday}`} />
        {events.length === 0 ? (
          <EmptyState
            title="Nothing in the Ticketmaster feed for this weekend"
            description="Check the full Nashville events calendar or come back closer to the weekend."
            action={
              <Link href="/events/" className="btn-primary">
                All events
              </Link>
            }
          />
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {events.map((event) => (
              <LiveEventCard key={`${event.source}-${event.id}`} item={event} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
