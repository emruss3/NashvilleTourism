import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs, FactTable, JsonLd, MapLink, PageHeader, SectionHeader } from '@/components/Ui';
import { EventCard, PhotoSlot } from '@/components/Cards';
import { PlacementLabel, VerificationBadge, formatDate } from '@/components/Trust';
import BookingLink from '@/components/BookingLink';
import { events, getEvent } from '@/lib/content';
import { neighborhoodName } from '@/lib/content/neighborhoods';
import { ANALYTICS_EVENTS } from '@/lib/analytics';
import { buildMetadata, eventSchema } from '@/lib/seo';

export function generateStaticParams() {
  return events.map((e) => ({ slug: e.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const e = getEvent(params.slug);
  if (!e) return buildMetadata({ title: 'Not found', description: '', path: '/events/', noindex: true });
  return buildMetadata({
    title: e.title,
    description: e.summary,
    path: `/events/${e.slug}/`,
    type: 'article',
    modifiedTime: e.dateUpdated || e.dateChecked,
  });
}

export default function EventPage({ params }: { params: { slug: string } }) {
  const e = getEvent(params.slug);
  if (!e) notFound();

  const hood = neighborhoodName(e.neighborhood);
  const related = e.relatedSlugs.map((s) => getEvent(s)).filter((x): x is NonNullable<typeof x> => Boolean(x));

  return (
    <div className="shell pb-16">
      <JsonLd data={eventSchema(e, `/events/${e.slug}/`)} />
      <Breadcrumbs
        trail={[
          { name: 'Events', href: '/events/' },
          { name: e.title, href: `/events/${e.slug}/` },
        ]}
      />

      <PageHeader
        eyebrow={`${e.category} · ${hood}`}
        title={e.title}
        intro={e.summary}
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <VerificationBadge status={e.dataStatus} date={e.dateChecked} />
            <PlacementLabel placement={e.placement} sponsorName={e.sponsorName} />
          </div>
        }
      />

      <div className="grid gap-10 py-10 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <PhotoSlot label={e.title} ratio="aspect-[16/9]" className="rounded-card" />
          <section className="py-8">
            <h2 className="text-2xl">About this event</h2>
            <div className="prose-editorial mt-3">
              <p>{e.description}</p>
            </div>
          </section>
          <section className="py-2">
            <h2 className="text-2xl">Before you go</h2>
            <div className="prose-editorial mt-3">
              <p>
                <strong className="text-ink">Tickets.</strong> {e.ticketNote}
              </p>
              <p>
                <strong className="text-ink">Parking.</strong> {e.parkingNote}
              </p>
              <p>
                <strong className="text-ink">Ages.</strong> {e.ageRestriction}
              </p>
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <FactTable
            rows={[
              { label: 'Date', value: <time dateTime={e.startDate}>{formatDate(e.startDate)}</time> },
              { label: 'Time', value: e.timeNote },
              { label: 'Venue', value: e.venue },
              { label: 'Neighborhood', value: <Link href={`/neighborhoods/${e.neighborhood}/`} className="text-clay underline underline-offset-2">{hood}</Link> },
              { label: 'Price', value: e.priceNote },
              { label: 'Ages', value: e.ageRestriction },
              { label: 'Verified', value: <time dateTime={e.dateChecked}>{formatDate(e.dateChecked)}</time> },
            ]}
          />
          <div className="space-y-3 rounded-card border border-paper-edge bg-white p-4">
            <BookingLink
              url={e.ticketUrl}
              label="Get tickets"
              name={e.title}
              slug={e.slug}
              event={ANALYTICS_EVENTS.TICKET_AFFILIATE_CLICKED}
              placement={e.placement === 'editorial' ? 'editorial' : e.placement}
            />
            <MapLink query={e.mapQuery} label="Venue map" />
          </div>
          <div className="rounded-card border border-paper-edge bg-paper-sunk p-4 text-sm text-ink-soft">
            <p>
              Event details change often. Confirm with the venue before travelling.{' '}
              <Link href="/corrections/" className="text-clay underline underline-offset-2">
                Report a change
              </Link>
            </p>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="border-t border-paper-edge py-10">
          <SectionHeader title="Related events" href="/events/" linkLabel="All events" />
          <div className="grid gap-5 lg:grid-cols-2">
            {related.map((x) => (
              <EventCard key={x.slug} item={x} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
