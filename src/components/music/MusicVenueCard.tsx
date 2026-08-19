import Link from 'next/link';
import { ContentImage, SmartImage } from '@/components/Media';
import type { LiveEvent } from '@/lib/feeds/ticketmaster';
import type { MusicVenueEntry } from '@/lib/music-venues';

export function MusicVenueMedia({
  venue,
  ratio = 'aspect-[3/2]',
  className = '',
  priority = false,
}: {
  venue: MusicVenueEntry;
  ratio?: string;
  className?: string;
  priority?: boolean;
}) {
  if (venue.editorial?.image) {
    return (
      <ContentImage
        image={venue.editorial.image}
        ratio={ratio}
        className={className}
        priority={priority}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      />
    );
  }

  return (
    <SmartImage
      imageKey={venue.imageKey}
      ratio={ratio}
      className={className}
      priority={priority}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
    />
  );
}

export default function MusicVenueCard({
  venue,
  events,
}: {
  venue: MusicVenueEntry;
  events: LiveEvent[];
}) {
  const nextEvent = events[0];
  const href = `/music/${venue.slug}/`;

  return (
    <article className="card group flex h-full flex-col overflow-hidden">
      <Link href={href} className="block overflow-hidden" aria-label={`View ${venue.name}`}>
        <MusicVenueMedia
          venue={venue}
          className="transition duration-500 group-hover:scale-[1.02]"
        />
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-2xs font-bold uppercase tracking-wider text-ink-faint">
            {venue.area} · {venue.format}
          </p>
          {venue.tourQuery ? (
            <span className="rounded-full bg-mint-wash px-2.5 py-1 text-2xs font-bold uppercase tracking-wider text-moss">
              Tour option
            </span>
          ) : venue.openingNote ? (
            <span className="rounded-full bg-gold-wash px-2.5 py-1 text-2xs font-bold uppercase tracking-wider text-gold">
              Coming soon
            </span>
          ) : null}
        </div>

        <h3 className="mt-2 font-sans text-xl font-bold leading-tight text-navy">
          <Link href={href} className="hover:text-clay">
            {venue.name}
          </Link>
        </h3>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{venue.summary}</p>

        {nextEvent ? (
          <div className="mt-5 rounded border border-paper-edge bg-paper-sunk p-3">
            <p className="text-2xs font-bold uppercase tracking-wider text-clay">Next show</p>
            <p className="mt-1 font-semibold leading-snug text-ink">{nextEvent.name}</p>
            <p className="mt-1 text-sm text-ink-faint">
              {formatEventDate(nextEvent.date)}
              {nextEvent.time ? ` · ${formatTime(nextEvent.time)}` : ''}
            </p>
          </div>
        ) : venue.openingNote ? (
          <div className="mt-5 rounded border border-gold/20 bg-gold-wash p-3 text-sm font-semibold text-gold">
            {venue.openingNote}
          </div>
        ) : (
          <div className="mt-5 rounded border border-paper-edge bg-paper-sunk p-3 text-sm text-ink-faint">
            No current Ticketmaster dates matched.
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-4 pt-5">
          <p className="text-sm font-medium text-ink-faint">
            {events.length > 0
              ? `${events.length} upcoming ${events.length === 1 ? 'event' : 'events'}`
              : venue.active
                ? 'Venue guide'
                : 'Track this venue'}
          </p>
          <Link href={href} className="btn-secondary min-h-[44px] shrink-0">
            View venue
          </Link>
        </div>
      </div>
    </article>
  );
}

function formatEventDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function formatTime(value: string): string {
  const [hourText, minute = '00'] = value.split(':');
  const hour = Number(hourText);
  if (!Number.isFinite(hour)) return value;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${minute} ${suffix}`;
}
