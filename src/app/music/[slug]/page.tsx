import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MusicVenueMedia } from '@/components/music/MusicVenueCard';
import { TourProductCard } from '@/components/tours/TourProductCard';
import {
  Breadcrumbs,
  FactTable,
  JsonLd,
  MapLink,
  Chip,
  SectionHeader,
} from '@/components/Ui';
import {
  AffiliateDisclosure,
  HowWeChooseCallout,
  VerificationBadge,
} from '@/components/Trust';
import { getCalendar } from '@/lib/feeds/calendar';
import type { LiveEvent } from '@/lib/feeds/ticketmaster';
import { getRymanTour } from '@/lib/feeds/venue-tours';
import {
  eventsForMusicVenue,
  getMusicVenue,
  musicVenues,
  type MusicVenueEntry,
} from '@/lib/music-venues';
import {
  buildMetadata,
  canonical,
  isIndexableRecord,
  musicVenueSchema,
} from '@/lib/seo';

export const revalidate = 1800;

export function generateStaticParams() {
  return musicVenues.map((venue) => ({ slug: venue.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const venue = getMusicVenue(params.slug);
  if (!venue) return {};

  const indexable = venue.editorial
    ? isIndexableRecord(venue.editorial)
    : venue.dataStatus === 'verified';

  return buildMetadata({
    title: `${venue.name} Events, Tickets${venue.tourQuery ? ' & Tours' : ''}`,
    description: `${venue.summary} See upcoming Ticketmaster events, practical venue details${
      venue.tourQuery ? ', and Ryman tour options' : ''
    }.`,
    path: `/music/${venue.slug}/`,
    type: 'article',
    modifiedTime: venue.dateChecked,
    noindex: !indexable,
  });
}

export default async function VenueDetail({
  params,
}: {
  params: { slug: string };
}) {
  const venue = getMusicVenue(params.slug);
  if (!venue) notFound();

  const [calendar, tourResult] = await Promise.all([
    getCalendar({ classificationName: 'music', size: 500 }),
    venue.tourQuery ? getRymanTour() : Promise.resolve(null),
  ]);

  const venueEvents = eventsForMusicVenue(calendar.events, venue);
  const related = venue.relatedSlugs
    .map((slug) => getMusicVenue(slug))
    .filter((item): item is MusicVenueEntry => Boolean(item));
  const indexable = venue.editorial
    ? isIndexableRecord(venue.editorial)
    : venue.dataStatus === 'verified';
  const schema = indexable
    ? venue.editorial
      ? musicVenueSchema(venue.editorial, venue.area)
      : {
          '@context': 'https://schema.org',
          '@type': 'MusicVenue',
          name: venue.name,
          description: venue.summary,
          address: venue.address,
          url: canonical(`/music/${venue.slug}/`),
        }
    : null;
  const firstEvent = venueEvents[0];
  const feedMessage = calendar.live
    ? 'Ticketmaster event data is refreshed throughout the day.'
    : calendar.configured
      ? 'Ticketmaster dates are temporarily unavailable.'
      : 'Live ticket inventory is not configured in this environment.';

  return (
    <div className="shell pb-16">
      <JsonLd data={schema} />
      <Breadcrumbs
        trail={[
          { name: 'Music', href: '/music/' },
          { name: venue.name, href: `/music/${venue.slug}/` },
        ]}
      />

      <header className="overflow-hidden rounded-card border border-paper-edge bg-navy text-white">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col justify-center px-6 py-10 sm:px-9 sm:py-12 lg:px-12">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-mint">
              {venue.area} · {venue.format}
            </p>
            <h1 className="mt-3 text-4xl leading-[1.02] text-white sm:text-5xl">
              {venue.name}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/78">
              {venue.summary}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <VerificationBadge
                status={venue.dataStatus}
                date={venue.dateChecked}
                className="border-white/20 bg-white/10 text-white"
              />
              {venueEvents.length > 0 ? (
                <span className="rounded border border-white/20 bg-white/10 px-2 py-0.5 text-2xs font-semibold text-white">
                  {venueEvents.length} upcoming{' '}
                  {venueEvents.length === 1 ? 'event' : 'events'}
                </span>
              ) : null}
              {venue.tourQuery ? (
                <span className="rounded border border-mint/40 bg-mint/15 px-2 py-0.5 text-2xs font-semibold text-mint">
                  Ryman tour option
                </span>
              ) : null}
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              {venueEvents.length > 0 ? (
                <a
                  href="#upcoming-events"
                  className="inline-flex min-h-[44px] items-center justify-center rounded bg-white px-5 py-2.5 text-sm font-bold text-navy transition hover:bg-paper-card"
                >
                  See upcoming events
                </a>
              ) : null}
              {venue.tourQuery ? (
                <a
                  href="#venue-tour"
                  className="inline-flex min-h-[44px] items-center justify-center rounded border border-white/35 bg-white/10 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/20"
                >
                  Tour the Ryman
                </a>
              ) : null}
              <MapLinkDark query={venue.mapQuery} />
            </div>

            {firstEvent ? (
              <p className="mt-6 text-sm text-white/65">
                Next: <span className="font-semibold text-white">{firstEvent.name}</span>
                {' · '}
                {formatEventDate(firstEvent.date)}
                {firstEvent.time ? ` at ${formatTime(firstEvent.time)}` : ''}
              </p>
            ) : venue.openingNote ? (
              <p className="mt-6 text-sm font-semibold text-gold-wash">{venue.openingNote}</p>
            ) : null}
          </div>

          <div className="min-h-[300px] bg-paper-sunk lg:min-h-[520px]">
            <MusicVenueMedia
              venue={venue}
              ratio="h-full min-h-[300px] lg:min-h-[520px]"
              className="h-full w-full"
              priority
            />
          </div>
        </div>
      </header>

      <section id="upcoming-events" className="scroll-mt-24 py-12">
        <SectionHeader
          eyebrow="Ticketmaster calendar"
          title={`Upcoming events at ${venue.name}`}
          description={
            venueEvents.length > 0
              ? `${venueEvents.length} upcoming ${
                  venueEvents.length === 1 ? 'date' : 'dates'
                } currently matched to this venue.`
              : 'No current Ticketmaster dates matched to this venue.'
          }
          href="/events/"
          linkLabel="All Nashville events"
        />

        {venueEvents.length > 0 ? (
          <div className="overflow-hidden rounded-card border border-paper-edge bg-white">
            {venueEvents.slice(0, 30).map((event, index) => (
              <VenueEventRow
                key={`${event.source}:${event.id}`}
                event={event}
                last={index === Math.min(venueEvents.length, 30) - 1}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-card border border-paper-edge bg-white p-6">
            <h3 className="font-sans text-lg font-bold text-navy">
              No upcoming Ticketmaster dates found
            </h3>
            <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-ink-soft">
              Smaller rooms sometimes sell through their own box office, and new dates can be
              added at any time. Check the venue directly or browse the full Nashville calendar.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/events/" className="btn-primary min-h-[44px]">
                Browse all events
              </Link>
              <MapLink query={venue.mapQuery} label="Open venue in maps" />
            </div>
          </div>
        )}

        <p className="mt-3 text-sm text-ink-faint">
          {feedMessage}
          {venueEvents.length > 30
            ? ` Showing the next 30 of ${venueEvents.length} matched dates.`
            : ''}
        </p>
      </section>

      {venue.tourQuery ? (
        <section
          id="venue-tour"
          className="scroll-mt-24 border-t border-paper-edge py-12"
        >
          <SectionHeader
            eyebrow="Daytime experience"
            title="Tour the Ryman Auditorium"
            description="See the room before showtime with a Ryman-specific tour or admission experience from Viator."
          />

          {tourResult?.product ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
              <TourProductCard product={tourResult.product} category="Ryman tour" />
              <div className="rounded-card border border-paper-edge bg-white p-6 sm:p-8">
                <p className="eyebrow">Why add the tour</p>
                <h3 className="mt-2 text-2xl">See the room without a concert ticket</h3>
                <p className="mt-4 max-w-prose text-[16px] leading-relaxed text-ink-soft">
                  A daytime visit gives you more time with the building, exhibits, and stage
                  history than a concert arrival usually allows. Keep the tour and evening show
                  as separate plans unless the product explicitly says otherwise.
                </p>
                <div className="mt-6">
                  <Link
                    href={`/tours/?q=${encodeURIComponent('Ryman Auditorium')}`}
                    className="btn-secondary min-h-[44px]"
                  >
                    Compare Ryman tour options
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-card border border-paper-edge bg-white p-6 sm:p-8">
              <h3 className="font-sans text-xl font-bold text-navy">
                Find a Ryman tour on Viator
              </h3>
              <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-ink-soft">
                A direct Ryman product was not available in the current feed, so use the
                filtered tour marketplace to compare live options rather than showing an
                unrelated city tour.
              </p>
              <Link
                href={`/tours/?q=${encodeURIComponent('Ryman Auditorium')}`}
                className="btn-primary mt-5 min-h-[44px]"
              >
                Search Ryman tours
              </Link>
            </div>
          )}

          <div className="mt-5">
            <AffiliateDisclosure compact />
          </div>
        </section>
      ) : null}

      <section className="grid gap-8 border-t border-paper-edge py-12 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
        <article className="prose max-w-none">
          <h2>Why we recommend it</h2>
          <p>{venue.whyWeRecommend}</p>

          <h2>Plan the room, not just the artist</h2>
          <p>
            Ticketing, seating, and arrival strategy vary widely across Nashville venues. Use
            the practical details here as a starting point, then confirm the final show policy
            on the ticket page before you go.
          </p>

          <div className="not-prose mt-6 flex flex-wrap gap-2">
            {venue.genres.map((genre) => (
              <Chip key={genre}>{genre}</Chip>
            ))}
          </div>
        </article>

        <aside className="space-y-4">
          <FactTable
            rows={[
              { label: 'Area', value: venue.area },
              { label: 'Venue type', value: venue.format },
              { label: 'Capacity', value: venue.capacityNote },
              { label: 'Tickets / cover', value: venue.coverNote },
              { label: 'Address', value: venue.address },
              {
                label: 'Upcoming events',
                value:
                  venueEvents.length > 0
                    ? `${venueEvents.length} currently matched`
                    : 'No current Ticketmaster match',
              },
            ]}
          />
          <MapLink query={venue.mapQuery} label={`Open ${venue.name} in maps`} />
        </aside>
      </section>

      <HowWeChooseCallout />

      {related.length > 0 ? (
        <section className="border-t border-paper-edge py-12">
          <SectionHeader
            eyebrow="Keep exploring"
            title="Related Nashville music venues"
            description="Rooms with a similar audience, location, or place in a Nashville music itinerary."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <RelatedVenueCard key={item.slug} venue={item} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function VenueEventRow({ event, last }: { event: LiveEvent; last: boolean }) {
  const price =
    typeof event.priceFrom === 'number'
      ? `From ${new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: event.currency || 'USD',
          maximumFractionDigits: 0,
        }).format(event.priceFrom)}`
      : null;

  return (
    <article
      className={`grid gap-4 px-4 py-5 sm:grid-cols-[5rem_minmax(0,1fr)_auto] sm:items-center sm:px-6 ${
        last ? '' : 'border-b border-paper-edge'
      }`}
    >
      <time
        dateTime={`${event.date}${event.time ? `T${event.time}` : ''}`}
        className="flex w-16 flex-col rounded border border-paper-edge bg-sky px-2 py-2 text-center"
      >
        <span className="text-2xs font-bold uppercase tracking-wider text-clay">
          {monthAbbr(event.date)}
        </span>
        <span className="text-2xl font-bold leading-none text-ink">{dayNumber(event.date)}</span>
        <span className="mt-1 text-2xs text-ink-faint">{weekday(event.date)}</span>
      </time>

      <div className="min-w-0">
        <p className="text-2xs font-bold uppercase tracking-wider text-ink-faint">
          {[event.genre, event.subGenre].filter(Boolean).join(' · ') || 'Live music'}
        </p>
        <h3 className="mt-1 font-sans text-lg font-bold leading-snug text-navy">
          {event.name}
        </h3>
        <p className="mt-1 text-sm text-ink-soft">
          {formatEventDate(event.date)}
          {event.time ? ` · ${formatTime(event.time)}` : ''}
          {price ? ` · ${price}` : ''}
        </p>
        <p className="mt-1 text-2xs text-ink-faint">Listing supplied by Ticketmaster.</p>
      </div>

      <a
        href={event.ticketUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary min-h-[44px] whitespace-nowrap text-center"
      >
        Tickets
        <span className="sr-only"> for {event.name} on Ticketmaster</span>
      </a>
    </article>
  );
}

function RelatedVenueCard({ venue }: { venue: MusicVenueEntry }) {
  return (
    <Link
      href={`/music/${venue.slug}/`}
      className="group rounded-card border border-paper-edge bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-lift"
    >
      <p className="text-2xs font-bold uppercase tracking-wider text-ink-faint">
        {venue.area} · {venue.format}
      </p>
      <h3 className="mt-2 font-sans text-lg font-bold text-navy group-hover:text-clay">
        {venue.name}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{venue.summary}</p>
    </Link>
  );
}

function MapLinkDark({ query }: { query: string }) {
  const href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-[44px] items-center justify-center rounded border border-white/35 bg-white/10 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/20"
    >
      Map
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function dateParts(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return { year, month, day };
}

function eventDate(value: string): Date | null {
  const { year, month, day } = dateParts(value);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function formatEventDate(value: string): string {
  const date = eventDate(value);
  if (!date) return value;
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function monthAbbr(value: string): string {
  const date = eventDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date);
}

function dayNumber(value: string): number | string {
  const { day } = dateParts(value);
  return day || '';
}

function weekday(value: string): string {
  const date = eventDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
}

function formatTime(value: string): string {
  const [hourText, minute = '00'] = value.split(':');
  const hour = Number(hourText);
  if (!Number.isFinite(hour)) return value;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${minute} ${suffix}`;
}
