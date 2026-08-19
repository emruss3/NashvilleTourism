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
  featured = false,
}: {
  venue: MusicVenueEntry;
  events: LiveEvent[];
  featured?: boolean;
}) {
  const nextEvent = events[0];
  const href = `/music/${venue.slug}/`;

  return (
    <article
      className={`card group relative flex h-full flex-col overflow-hidden ${
        featured ? 'sm:flex-row' : ''
      }`}
    >
      <div className={featured ? 'overflow-hidden sm:w-1/2' : 'overflow-hidden'}>
        <MusicVenueMedia
          venue={venue}
          ratio={featured ? 'aspect-[16/10] sm:h-full sm:min-h-[16rem] sm:aspect-auto' : 'aspect-[3/2]'}
          className="transition duration-500 group-hover:scale-[1.02]"
          priority={featured}
        />
      </div>

      <div className={`flex flex-1 flex-col p-5 ${featured ? 'sm:w-1/2 sm:justify-center' : ''}`}>
        <p className="text-2xs font-medium uppercase tracking-wider text-ink-faint">
          {venue.area} · {venue.format}
        </p>

        <h3 className="mt-2 font-sans text-lg font-bold leading-tight text-navy">
          <Link href={href} className="after:absolute after:inset-0 hover:text-clay">
            {venue.name}
          </Link>
        </h3>
        <p className="mt-2 flex-1 text-small leading-relaxed text-ink-soft">{venue.summary}</p>

        {nextEvent ? (
          <p className="mt-4 text-sm text-ink">
            <span className="font-semibold">Next:</span>{' '}
            {nextEvent.name}
            <span className="text-ink-faint">
              {' '}
              · {formatEventDate(nextEvent.date)}
              {nextEvent.time ? ` · ${formatTime(nextEvent.time)}` : ''}
            </span>
          </p>
        ) : venue.openingNote ? (
          <p className="mt-4 text-sm font-medium text-ink-soft">{venue.openingNote}</p>
        ) : null}

        <p className="mt-3 text-sm font-semibold text-clay">
          {events.length > 0
            ? `${events.length} upcoming ${events.length === 1 ? 'date' : 'dates'}`
            : venue.active
              ? 'Venue guide'
              : 'Track this venue'}
        </p>
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
