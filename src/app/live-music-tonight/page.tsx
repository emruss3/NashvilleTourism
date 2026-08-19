import Link from 'next/link';
import { Breadcrumbs, PageHeader } from '@/components/Ui';
import HubLead from '@/components/HubLead';
import LiveMusicCalendar from '@/components/LiveMusicCalendar';
import { getCalendar, genresOf, venuesOf } from '@/lib/feeds/calendar';
import { buildMetadata } from '@/lib/seo';
import { formatDate } from '@/components/Trust';

export const revalidate = 1800;

export const metadata = buildMetadata({
  title: 'Live Music in Nashville Tonight: Full Show Calendar',
  description:
    'Nashville concerts and live music shows, sortable by date, venue, genre, and price. Find who is playing tonight and book tickets.',
  path: '/live-music-tonight/',
});

/** Ticketmaster-backed Nashville-only music calendar. */
export default async function LiveMusicPage() {
  const { events, live, fetchedAt, configured } = await getCalendar({
    classificationName: 'music',
  });

  return (
    <div className="shell pb-24">
      <Breadcrumbs trail={[{ name: 'Live music tonight', href: '/live-music-tonight/' }]} />
      <PageHeader
        eyebrow="Show calendar"
        title="Live music in Nashville tonight"
        intro="Concerts and live music at Nashville venues only. Filter by tonight, this weekend, venue, or genre—then book tickets or plan Broadway around a ticketed show."
      />
      <HubLead imageKey="music/ascend-amphitheater" />

      <section className="max-w-3xl space-y-4 py-8 text-[15px] leading-relaxed text-ink-soft">
        <p>
          Use this calendar when you need a specific answer: who is playing live music in Nashville
          tonight, which venues still have tickets, and what else is on this weekend. Ticketed halls
          and amphitheaters sit beside club and theater dates; free honky-tonk stages on Broadway are
          covered separately in the{' '}
          <Link
            href="/honky-tonk-highway/"
            className="text-clay underline underline-offset-2 hover:text-clay-deep"
          >
            honky-tonk highway guide
          </Link>
          .
        </p>
        <p>
          If a show is the reason for the trip, lock tickets first, then place lodging with the{' '}
          <Link href="/where-to-stay/" className="text-clay underline underline-offset-2 hover:text-clay-deep">
            where to stay
          </Link>{' '}
          hub or the{' '}
          <Link href="/plan/" className="text-clay underline underline-offset-2 hover:text-clay-deep">
            trip planner
          </Link>
          . For the full ticketed calendar beyond music, open{' '}
          <Link href="/events/" className="text-clay underline underline-offset-2 hover:text-clay-deep">
            Nashville events
          </Link>{' '}
          or{' '}
          <Link
            href="/events/this-weekend/"
            className="text-clay underline underline-offset-2 hover:text-clay-deep"
          >
            this weekend
          </Link>
          . Venue primers live under{' '}
          <Link href="/music/" className="text-clay underline underline-offset-2 hover:text-clay-deep">
            music venues
          </Link>
          .
        </p>
      </section>

      {!live && (
        <div className="mt-2 rounded border border-clay/20 bg-paper-card p-4 text-sm text-clay-deep">
          <strong className="font-semibold">Sample listings.</strong>{' '}
          {configured
            ? 'The live Ticketmaster-backed calendar did not return fresh Nashville results. Showing clearly labeled fallback records instead.'
            : 'No canonical events feed is active yet. Configure TICKETMASTER_API_KEY in Supabase, run the first verified sync, and then enable the scheduled event refresh.'}
        </div>
      )}

      <div className="mt-6">
        <LiveMusicCalendar
          events={events}
          genres={genresOf(events)}
          venues={venuesOf(events)}
          live={live}
        />
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 text-sm text-ink-faint">
        <p>
          Calendar refreshed <time dateTime={fetchedAt}>{formatDate(fetchedAt.slice(0, 10))}</time>.
          {live ? ' Listings supplied by Ticketmaster through Nashroam’s canonical event feed.' : ''}
        </p>
        <p>
          <Link href="/music/" className="text-clay underline underline-offset-2">
            Browse venues instead
          </Link>
        </p>
      </div>

      <section className="mt-12 rounded-card border border-paper-edge bg-white p-6">
        <h2 className="font-display text-xl">How to see live music here</h2>
        <ul className="mt-3 space-y-2 text-[15px] text-ink-soft">
          <li className="flex gap-2.5">
            <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-clay" />
            The honky-tonks on Broadway are free to enter and run bands from late morning to close.
            Bring cash to tip.
          </li>
          <li className="flex gap-2.5">
            <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-clay" />
            Listening rooms are small, seated, and sell out well ahead. Book those first and plan the
            rest of the night around them.
          </li>
          <li className="flex gap-2.5">
            <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-clay" />
            Ticketed halls take the touring acts. Check the calendar before you fix your dates if a
            specific artist is the reason for the trip.
          </li>
        </ul>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/music/" className="btn-secondary">
            All venues
          </Link>
          <Link href="/plan/" className="btn-primary">
            Build a music itinerary
          </Link>
          <Link href="/neighborhoods/downtown-broadway/" className="btn-tertiary">
            Downtown guide
          </Link>
        </div>
      </section>
    </div>
  );
}
