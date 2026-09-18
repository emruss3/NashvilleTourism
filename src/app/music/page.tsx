import Link from 'next/link';
import { SmartImage } from '@/components/Media';
import SaveButton from '@/components/SaveButton';
import { HowWeChooseCallout } from '@/components/Trust';
import { Breadcrumbs, JsonLd } from '@/components/Ui';
import EventSchedule from '@/components/events/EventSchedule';
import PageIntro from '@/components/hub/PageIntro';
import SearchField from '@/components/hub/SearchField';
import SectionHead from '@/components/hub/SectionHead';
import { MusicVenueMedia } from '@/components/music/MusicVenueCard';
import { guides } from '@/lib/content';
import { WHEN_OPTIONS } from '@/lib/explore';
import { getCalendar } from '@/lib/feeds/calendar';
import type { LiveEvent } from '@/lib/feeds/ticketmaster';
import { buildMusicVenueEventMap, matchedMusicVenueEvents, musicVenueGroups, musicVenues, type MusicVenueEntry } from '@/lib/music-venues';
import { buildMetadata, itemListSchema } from '@/lib/seo';

export const revalidate = 1800;

export const metadata = buildMetadata({
  title: 'Live Music in Nashville',
  description:
    'Choose a Nashville music venue by room type, from the Ryman and the Opry to listening rooms and clubs, then see the next ticketed dates at each one.',
  path: '/music/',
});

/**
 * Music: venues and shows, in the page-family system. Opener with the live
 * performance photograph and a date-first search into the events schedule,
 * then the next matched dates as a day-grouped schedule, then the venue
 * directory by room type with Save on each venue, the Broadway hand-off,
 * and the music guide. Every date comes from the live calendar; with no
 * feed the schedule says so rather than inventing shows.
 */
export default async function MusicIndex() {
  const calendar = await getCalendar({ classificationName: 'music', size: 500 });
  const eventMap = buildMusicVenueEventMap(calendar.events);
  const matched = matchedMusicVenueEvents(eventMap);
  const upcoming: LiveEvent[] = matched.slice(0, 8).map((m) => m.event);
  const activeVenues = musicVenues.filter((venue) => venue.active);
  const musicGuides = guides.filter((guide) => guide.cluster === 'Music');

  return (
    <>
      <JsonLd
        data={itemListSchema(
          activeVenues.map((venue) => ({ name: venue.name, url: `/music/${venue.slug}/`, description: venue.summary })),
          'Nashville Live Music Venues',
        )}
      />
      <div className="shell">
        <Breadcrumbs trail={[{ name: 'Music', href: '/music/' }]} />
      </div>

      <PageIntro
        layout="over"
        eyebrow="Music"
        title={
          <>
            Music
            <br />
            lives here.
          </>
        }
        support="Historic halls, arenas, listening rooms and clubs. Pick the room, then lock the date."
        media={<SmartImage imageKey="editorial/live-performance-overhead" ratio="h-full" sizes="100vw" priority />}
      >
        <SearchField
          action="/events/"
          label="Search artists, shows or venues"
          placeholder="Search artists, shows or venues"
          hidden={{ category: 'Music' }}
          tone="ink"
          buttonLabel="Find shows"
        />
        <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
          {WHEN_OPTIONS.map((w) => (
            <li key={w.value}>
              <Link href={`/events/?category=Music&when=${w.value}`} className="inline-flex min-h-11 items-center text-[15px] font-semibold text-paper underline-offset-[0.2em] hover:underline">
                {w.label}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/honky-tonk-highway/" className="inline-flex min-h-11 items-center text-[15px] font-semibold text-paper/85 underline-offset-[0.2em] hover:underline">
              Free Broadway stages
            </Link>
          </li>
        </ul>
      </PageIntro>

      <section className="shell section" aria-labelledby="dates-title">
        <SectionHead
          id="dates-title"
          eyebrow="Coming up"
          title="Next dates at these rooms."
          support={calendar.live ? 'The nearest ticketed shows matched to the venues in this guide. Listings supplied by Ticketmaster.' : undefined}
          size="md"
          href="/events/?category=Music"
          linkLabel="Full music calendar"
        />
        <div className="mt-5">
          {!calendar.live ? (
            <div className="rounded-card border border-paper-edge p-6">
              <p className="text-[17px] font-semibold">Pick the room first; the date follows.</p>
              <p className="mt-2 max-w-prose text-[15px] text-ink-soft">
                Every venue guide below covers the cover charge, set times and where the box office sends you. Most of these rooms
                have music seven nights a week.
              </p>
            </div>
          ) : upcoming.length === 0 ? (
            <div className="rounded-card border border-dashed border-paper-edge p-8 text-center">
              <p className="text-[17px] font-semibold">No upcoming shows matched these rooms yet.</p>
              <Link href="/events/?category=Music" className="btn-secondary mt-5">
                All music events
              </Link>
            </div>
          ) : (
            <EventSchedule events={upcoming} />
          )}
        </div>
      </section>

      <nav aria-label="Room types" className="border-y border-paper-edge">
        <ul className="shell flex gap-1 overflow-x-auto py-1 md:justify-center md:gap-6">
          {musicVenueGroups.map((group) => (
            <li key={group.id} className="shrink-0">
              <a href={`#${group.id}`} className="inline-flex min-h-12 items-center border-b-2 border-transparent px-3 text-[15px] font-semibold text-ink hover:border-ink/40">
                {group.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {musicVenueGroups.map((group, gi) => {
        const groupVenues = musicVenues.filter((venue) => venue.group === group.id);
        if (groupVenues.length === 0) return null;
        const featured = group.id === 'nashville-icons';
        return (
          <section key={group.id} id={group.id} className={`shell section scroll-mt-20 ${gi > 0 ? 'border-t border-paper-edge' : ''}`} aria-labelledby={`${group.id}-title`}>
            <SectionHead id={`${group.id}-title`} eyebrow="Venues" title={group.title} support={group.description} size="md" />
            <ul className={`mt-6 grid gap-4 ${featured ? 'md:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
              {groupVenues.map((venue) => (
                <li key={venue.slug}>
                  <VenueTile venue={venue} events={eventMap.get(venue.slug) ?? []} featured={featured} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <section className="bg-ink text-paper" aria-labelledby="broadway-title">
        <div className="shell section grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)_auto] lg:items-center lg:gap-10">
          <div>
            <p className="eyebrow text-paper/75">No ticket needed</p>
            <h2 id="broadway-title" className="mt-1 text-[2rem] text-paper sm:text-[2.5rem] lg:text-[3rem]">
              Broadway plays every night.
            </h2>
            <p className="mt-3 max-w-md text-[16px] text-paper/80">Free stages on Lower Broadway run from late morning to close. Ticketed rooms are the other half of the story; the honky-tonk guide covers this one.</p>
          </div>
          <div className="overflow-hidden rounded-card bg-paper/10">
            <SmartImage imageKey="editorial/broadway-nightlife" ratio="aspect-[16/9]" sizes="(max-width: 1023px) 100vw, 33vw" />
          </div>
          <Link href="/honky-tonk-highway/" className="btn-reverse justify-self-start lg:justify-self-end">
            The honky-tonk highway
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      {musicGuides.length > 0 ? (
        <section className="shell section" aria-labelledby="guides-title">
          <SectionHead id="guides-title" eyebrow="From the desk" title="Choose the right night." size="md" href="/guides/" linkLabel="All guides" />
          <ul className="mt-5 grid gap-3 md:grid-cols-2">
            {musicGuides.map((g) => (
              <li key={g.slug}>
                <Link href={`/guides/${g.slug}/`} className="card flex h-full items-center justify-between gap-4 px-4 py-4">
                  <span>
                    <span className="block text-2xs font-semibold uppercase tracking-[0.14em] text-ink-soft">{g.readingTimeMinutes} min read</span>
                    <span className="mt-0.5 block font-sans text-[17px] font-bold">{g.title}</span>
                    <span className="mt-1 block text-[15px] text-ink-soft">{g.summary}</span>
                  </span>
                  <span aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="shell pb-10">
        <HowWeChooseCallout />
      </div>
    </>
  );
}

function VenueTile({ venue, events, featured }: { venue: MusicVenueEntry; events: LiveEvent[]; featured: boolean }) {
  const next = events[0];
  const href = `/music/${venue.slug}/`;
  return (
    <article className="group relative flex h-full flex-col">
      <div className="overflow-hidden rounded-card bg-ink">
        <MusicVenueMedia venue={venue} ratio={featured ? 'aspect-[16/9]' : 'aspect-[4/3]'} priority={featured} />
      </div>
      <div className="flex flex-1 items-start justify-between gap-2 pt-3">
        <div className="min-w-0">
          <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
            {venue.area} · {venue.format}
          </p>
          <h3 className={`mt-0.5 font-sans font-bold leading-snug ${featured ? 'text-[1.375rem]' : 'text-[17px]'}`}>
            <Link href={href} className="after:absolute after:inset-0 underline-offset-[0.2em] hover:underline">
              {venue.name}
            </Link>
          </h3>
          <p className="mt-1 text-[15px] text-ink-soft">{venue.summary}</p>
          <p className="mt-2 text-sm text-ink">
            {next ? (
              <>
                <span className="font-semibold">Next:</span> {next.name}
                <span className="text-ink-soft"> · {formatDay(next.date)}{next.time ? ` · ${formatTime(next.time)}` : ''}</span>
                {events.length > 1 ? <span className="text-ink-soft"> · {events.length} dates</span> : null}
              </>
            ) : venue.openingNote ? (
              <span className="text-ink-soft">{venue.openingNote}</span>
            ) : (
              <span className="text-ink-soft">Venue guide</span>
            )}
          </p>
        </div>
        <SaveButton variant="icon" className="relative z-10 -mr-2 -mt-1" item={{ id: `venue:${venue.slug}`, kind: 'event', title: venue.name, href, meta: `${venue.area} · ${venue.format}` }} />
      </div>
    </article>
  );
}

function formatDay(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function formatTime(value: string): string {
  const [hourText, minute = '00'] = value.split(':');
  const hour = Number(hourText);
  if (!Number.isFinite(hour)) return value;
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? 'PM' : 'AM'}`;
}
