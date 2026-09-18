import Link from 'next/link';
import { MusicVenueMedia } from '@/components/music/MusicVenueCard';
import { musicVenues } from '@/lib/music-venues';

/**
 * What event surfaces show when no dated listings are available for the
 * window: the rooms that have music most nights, drawn from the venue
 * shortlist. Real places, real links, no invented dates.
 */
const PICKS = ['ryman-auditorium', 'station-inn', 'bluebird-cafe', 'grand-ole-opry', '3rd-and-lindsley', 'the-basement-east'];

export default function RoomsTonight({
  title = 'Tonight starts with the room.',
  note = 'Most of these have music seven nights a week. Set times and covers are on each venue page.',
  limit = 3,
}: {
  title?: string;
  note?: string;
  limit?: number;
}) {
  const bySlug = new Map(musicVenues.map((v) => [v.slug, v]));
  const rooms = PICKS.map((s) => bySlug.get(s)).filter((v): v is NonNullable<typeof v> => Boolean(v && v.active)).slice(0, limit);
  if (rooms.length === 0) return null;

  return (
    <div className="rounded-card border border-paper-edge p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <h3 className="text-[1.375rem] sm:text-[1.5rem]">{title}</h3>
        <Link href="/music/" className="inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-ink underline-offset-[0.2em] hover:underline">
          All venues <span aria-hidden="true">→</span>
        </Link>
      </div>
      <ul className="mt-4 grid gap-4 sm:grid-cols-3">
        {rooms.map((venue) => (
          <li key={venue.slug} className="group relative">
            <div className="overflow-hidden rounded-card bg-ink">
              <MusicVenueMedia venue={venue} ratio="aspect-[4/3]" />
            </div>
            <p className="mt-2 text-2xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
              {venue.area} · {venue.format}
            </p>
            <h4 className="mt-0.5 font-sans text-[17px] font-bold leading-snug">
              <Link href={`/music/${venue.slug}/`} className="after:absolute after:inset-0 underline-offset-[0.2em] hover:underline">
                {venue.name}
              </Link>
            </h4>
            <p className="mt-1 text-sm text-ink-soft">{venue.coverNote}</p>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-ink-soft">
        {note}{' '}
        <Link href="/honky-tonk-highway/" className="font-semibold text-ink underline-offset-[0.2em] hover:underline">
          Or walk the honky-tonk highway.
        </Link>
      </p>
    </div>
  );
}
