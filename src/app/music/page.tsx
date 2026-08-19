import Link from 'next/link';
import LiveEventCard from '@/components/LiveEventCard';
import HubLead from '@/components/HubLead';
import MusicVenueCard from '@/components/music/MusicVenueCard';
import { Breadcrumbs, JsonLd, PageHeader, SectionHeader } from '@/components/Ui';
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
    'Choose a Nashville music venue by room type, then see upcoming Ticketmaster dates at halls, clubs, and listening rooms.',
  path: '/music/',
});

const MUSIC_PATHS = [
  {
    href: '/live-music-tonight/',
    label: 'Tonight and this weekend',
    description: 'Filter the Ticketmaster calendar by date, venue, and genre.',
  },
  {
    href: '/honky-tonk-highway/',
    label: 'Broadway honky-tonks',
    description: 'Free stages on Lower Broadway, separate from ticketed halls.',
  },
  {
    href: '/events/',
    label: 'All ticketed events',
    description: 'Concerts plus sports, theater, and festival weekends.',
  },
] as const;

export default async function MusicIndex() {
  const calendar = await getCalendar({ classificationName: 'music', size: 500 });
  const eventMap = buildMusicVenueEventMap(calendar.events);
  const matched = matchedMusicVenueEvents(eventMap);
  const activeVenues = musicVenues.filter((venue) => venue.active);
  const musicGuides = guides.filter((guide) => guide.cluster === 'Music');
  const feedMessage = calendar.live
    ? 'Upcoming dates are supplied by Ticketmaster and refresh throughout the day.'
    : calendar.configured
      ? 'Ticketmaster dates are temporarily unavailable. Venue guides are still available.'
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
      <PageHeader
        eyebrow="Venues and shows"
        title="Live Music in Nashville"
        intro="Start with the room: a historic hall, arena, outdoor stage, songwriter circle, or standing-room club. Each venue page pairs a practical guide with the next Ticketmaster dates we can match."
      />
      <HubLead imageKey="hub/live-music" />

      <section className="max-w-3xl space-y-4 py-8 text-small leading-relaxed text-ink-soft">
        <p>
          Use this hub to pick a venue, then lock a date. Ticketed rooms are not the same as Broadway:
          Lower Broadway stages are covered in the{' '}
          <Link
            href="/honky-tonk-highway/"
            className="text-clay underline underline-offset-2 hover:text-clay-deep"
          >
            honky-tonk highway guide
          </Link>
          . For a tonight-first list, open{' '}
          <Link
            href="/live-music-tonight/"
            className="text-clay underline underline-offset-2 hover:text-clay-deep"
          >
            live music tonight
          </Link>
          .
        </p>
        <p>
          If a show is the reason for the trip, buy tickets first, then place lodging with{' '}
          <Link href="/where-to-stay/" className="text-clay underline underline-offset-2 hover:text-clay-deep">
            where to stay
          </Link>{' '}
          or the{' '}
          <Link href="/plan/" className="text-clay underline underline-offset-2 hover:text-clay-deep">
            trip planner
          </Link>
          .
        </p>
      </section>

      <section className="grid gap-4 pb-10 sm:grid-cols-3">
        {MUSIC_PATHS.map((path) => (
          <Link
            key={path.href}
            href={path.href}
            className="rounded-card border border-paper-edge bg-paper-card p-5 transition hover:shadow-lift"
          >
            <span className="block font-sans text-lg font-bold text-navy">{path.label}</span>
            <span className="mt-2 block text-small leading-relaxed text-ink-soft">{path.description}</span>
          </Link>
        ))}
      </section>

      <p className="text-sm text-ink-faint">{feedMessage}</p>

      {matched.length > 0 ? (
        <section className="py-12">
          <SectionHeader
            eyebrow="Coming up"
            title="Next dates at these venues"
            description="The nearest Ticketmaster shows matched to rooms in this guide."
            href="/live-music-tonight/"
            linkLabel="Full music calendar"
          />
          <div className="grid gap-4 lg:grid-cols-2">
            {matched.slice(0, 6).map(({ event }) => (
              <LiveEventCard key={`${event.source}:${event.id}`} item={event} />
            ))}
          </div>
        </section>
      ) : null}

      <nav aria-label="Music venue categories" className="flex flex-wrap gap-2 pb-2">
        {musicVenueGroups.map((group) => (
          <a
            key={group.id}
            href={`#${group.id}`}
            className="rounded-full border border-paper-edge bg-paper-card px-4 py-1.5 text-sm text-ink-soft transition-colors hover:border-clay hover:text-clay"
          >
            {group.title}
          </a>
        ))}
      </nav>

      <div id="venues" className="scroll-mt-24">
        {musicVenueGroups.map((group) => {
          const groupVenues = musicVenues.filter((venue) => venue.group === group.id);
          if (groupVenues.length === 0) return null;
          const featured = group.id === 'nashville-icons';

          return (
            <section
              key={group.id}
              id={group.id}
              className="scroll-mt-24 border-t border-paper-edge py-12 first:border-t-0"
            >
              <SectionHeader title={group.title} description={group.description} />
              <div className={featured ? 'grid gap-5 lg:grid-cols-2' : 'grid gap-5 sm:grid-cols-2 lg:grid-cols-3'}>
                {groupVenues.map((venue) => (
                  <MusicVenueCard
                    key={venue.slug}
                    venue={venue}
                    events={eventMap.get(venue.slug) ?? []}
                    featured={featured}
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
            title="Music guides"
            description="How to choose a neighborhood, room type, and kind of night."
            href="/guides/"
            linkLabel="All guides"
          />
          <ul className="grid gap-3 sm:grid-cols-2">
            {musicGuides.map((guide) => (
              <li key={guide.slug}>
                <Link
                  href={`/guides/${guide.slug}/`}
                  className="block h-full rounded-card border border-paper-edge bg-paper-card p-5 transition hover:shadow-lift"
                >
                  <span className="text-2xs font-bold uppercase tracking-wider text-clay">Music guide</span>
                  <span className="mt-2 block font-sans text-lg font-bold text-navy">{guide.title}</span>
                  <span className="mt-2 block text-small leading-relaxed text-ink-soft">{guide.summary}</span>
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
