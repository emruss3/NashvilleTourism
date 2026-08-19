import Link from 'next/link';
import LiveEventCard from '@/components/LiveEventCard';
import { SmartImage } from '@/components/Media';
import MusicVenueCard from '@/components/music/MusicVenueCard';
import { Breadcrumbs, JsonLd, SectionHeader } from '@/components/Ui';
import { HowWeChooseCallout } from '@/components/Trust';
import { guides } from '@/lib/content';
import { getCalendar } from '@/lib/feeds/calendar';
import {
  buildMusicVenueEventMap,
  matchedMusicVenueEvents,
  musicVenueGroups,
  musicVenues,
} from '@/lib/music-venues';
import { buildMetadata, itemListSchema } from '@/lib/seo';

export const revalidate = 1800;

export const metadata = buildMetadata({
  title: 'Live Music in Nashville',
  description:
    'Explore Nashville music venues by type, then see upcoming Ticketmaster events at the Ryman, Grand Ole Opry, Bridgestone Arena, listening rooms, and clubs.',
  path: '/music/',
});

export default async function MusicIndex() {
  const calendar = await getCalendar({ classificationName: 'music', size: 500 });
  const eventMap = buildMusicVenueEventMap(calendar.events);
  const matched = matchedMusicVenueEvents(eventMap);
  const activeVenues = musicVenues.filter((venue) => venue.active);
  const venuesWithEvents = activeVenues.filter(
    (venue) => (eventMap.get(venue.slug)?.length ?? 0) > 0,
  ).length;
  const musicGuides = guides.filter((guide) => guide.cluster === 'Music');
  const feedMessage = calendar.live
    ? 'Upcoming show data is supplied by Ticketmaster and refreshed throughout the day.'
    : calendar.configured
      ? 'Ticketmaster dates are temporarily unavailable. Venue guides and planning details are still available.'
      : 'Live ticket inventory is not configured in this environment. Venue guides remain available.';

  return (
    <div className="shell pb-16">
      <JsonLd
        data={itemListSchema(
          activeVenues.map((venue) => ({
            name: venue.name,
            url: `/music/${venue.slug}/`,
            description: venue.summary,
          })),
          'Nashville Live Music Venues',
        )}
      />

      <Breadcrumbs trail={[{ name: 'Music', href: '/music/' }]} />

      <header className="relative isolate overflow-hidden rounded-card bg-navy text-white">
        <div className="absolute inset-0" aria-hidden="true">
          <SmartImage
            imageKey="hub/live-music"
            ratio="h-full"
            className="h-full w-full"
            priority
            sizes="(min-width: 1024px) 1200px, 100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/90 to-navy/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy/50 via-transparent to-transparent" />
        </div>

        <div className="relative max-w-3xl px-6 py-12 sm:px-10 sm:py-16 lg:py-20">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-mint">
            Live music
          </p>
          <h1 className="mt-3 max-w-2xl text-4xl leading-[1.02] text-white sm:text-5xl lg:text-6xl">
            Find the right Nashville room—and the next show in it.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/80">
            Start with the venue: a historic theater, arena, outdoor stage, songwriter room,
            or standing-room club. Each guide now brings its Ticketmaster calendar into one
            place.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href="#venues"
              className="inline-flex min-h-[44px] items-center justify-center rounded bg-white px-5 py-2.5 text-sm font-bold text-navy transition hover:bg-paper-card"
            >
              Browse venues
            </a>
            <Link
              href="/live-music-tonight/"
              className="inline-flex min-h-[44px] items-center justify-center rounded border border-white/35 bg-white/10 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/20"
            >
              Live music tonight
            </Link>
          </div>
        </div>

        <dl className="relative grid border-t border-white/15 bg-navy/35 sm:grid-cols-3">
          <Stat value={activeVenues.length} label="active venue guides" />
          <Stat value={matched.length} label="matched upcoming events" />
          <Stat value={venuesWithEvents} label="venues with dates" />
        </dl>
      </header>

      <nav
        aria-label="Music venue categories"
        className="mt-6 overflow-x-auto rounded-card border border-paper-edge bg-white px-3 py-2"
      >
        <ul className="flex min-w-max gap-1">
          {musicVenueGroups.map((group) => (
            <li key={group.id}>
              <a
                href={`#${group.id}`}
                className="inline-flex min-h-[40px] items-center rounded px-3 py-2 text-sm font-semibold text-ink-soft hover:bg-paper-sunk hover:text-clay"
              >
                {group.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <p className="mt-3 text-sm text-ink-faint">{feedMessage}</p>

      {matched.length > 0 ? (
        <section className="py-12">
          <SectionHeader
            eyebrow="Coming up"
            title="Next up at these venues"
            description="The nearest Ticketmaster dates matched to the rooms in this guide."
            href="/events/"
            linkLabel="See all Nashville events"
          />
          <div className="grid gap-4 lg:grid-cols-2">
            {matched.slice(0, 6).map(({ event }) => (
              <LiveEventCard key={`${event.source}:${event.id}`} item={event} />
            ))}
          </div>
        </section>
      ) : null}

      <div id="venues" className="scroll-mt-24">
        {musicVenueGroups.map((group) => {
          const groupVenues = musicVenues.filter((venue) => venue.group === group.id);
          if (groupVenues.length === 0) return null;

          return (
            <section
              key={group.id}
              id={group.id}
              className="scroll-mt-24 border-t border-paper-edge py-12 first:border-t-0"
            >
              <SectionHeader
                eyebrow="Venue directory"
                title={group.title}
                description={group.description}
              />
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {groupVenues.map((venue) => (
                  <MusicVenueCard
                    key={venue.slug}
                    venue={venue}
                    events={eventMap.get(venue.slug) ?? []}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {musicGuides.length > 0 ? (
        <section className="border-t border-paper-edge py-12">
          <SectionHeader
            eyebrow="Plan the night"
            title="Music guides"
            description="Context for choosing a neighborhood, room, and kind of Nashville music experience."
            href="/guides/"
            linkLabel="All guides"
          />
          <ul className="grid gap-3 sm:grid-cols-2">
            {musicGuides.map((guide) => (
              <li key={guide.slug}>
                <Link
                  href={`/guides/${guide.slug}/`}
                  className="block h-full rounded-card border border-paper-edge bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-lift"
                >
                  <span className="text-2xs font-bold uppercase tracking-wider text-clay">
                    Music guide
                  </span>
                  <span className="mt-2 block font-sans text-lg font-bold text-navy">
                    {guide.title}
                  </span>
                  <span className="mt-2 block text-[15px] leading-relaxed text-ink-soft">
                    {guide.summary}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="border-t border-paper-edge py-10">
        <HowWeChooseCallout />
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="border-white/15 px-6 py-5 sm:border-l sm:first:border-l-0">
      <dt className="text-2xl font-bold text-white">{value.toLocaleString()}</dt>
      <dd className="mt-1 text-sm text-white/65">{label}</dd>
    </div>
  );
}
