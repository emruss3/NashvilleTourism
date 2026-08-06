import Link from 'next/link';
import type { LiveEvent } from '@/lib/feeds/ticketmaster';

/** Compact homepage card for normalized live-calendar records. */
export default function LiveEventCard({ item }: { item: LiveEvent }) {
  const external = /^https?:\/\//i.test(item.ticketUrl);
  const meta = [item.genre, item.city].filter(Boolean).join(' · ');
  const price =
    typeof item.priceFrom === 'number'
      ? `From ${new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: item.currency || 'USD',
          maximumFractionDigits: 0,
        }).format(item.priceFrom)}`
      : undefined;

  const titleClass = 'after:absolute after:inset-0 hover:text-clay';

  return (
    <article className="card group relative flex gap-4 overflow-hidden p-4">
      <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded border border-paper-edge bg-sky py-2 text-center">
        <span className="text-2xs font-bold uppercase tracking-wider text-clay">
          {monthAbbr(item.date)}
        </span>
        <span className="text-xl font-bold leading-none text-ink">{dayNum(item.date)}</span>
      </div>

      <div className="min-w-0 flex flex-1 flex-col gap-1.5">
        {meta && (
          <p className="text-2xs font-medium uppercase tracking-wider text-ink-faint">{meta}</p>
        )}
        <h3 className="font-sans text-base font-bold leading-snug text-ink">
          {external ? (
            <a
              href={item.ticketUrl}
              className={titleClass}
              target="_blank"
              rel="noopener noreferrer"
            >
              {item.name}
            </a>
          ) : (
            <Link href={item.ticketUrl} className={titleClass}>
              {item.name}
            </Link>
          )}
        </h3>
        <p className="text-sm text-ink-faint">
          {item.venue}
          {item.time ? ` · ${formatTime(item.time)}` : ''}
          {price ? ` · ${price}` : ''}
        </p>
        {item.source === 'ticketmaster' && (
          <p className="text-2xs text-ink-faint">Event listing supplied by Ticketmaster.</p>
        )}
      </div>
    </article>
  );
}

function monthAbbr(iso: string) {
  const month = Number(iso.split('-')[1]);
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][
    month - 1
  ] ?? '';
}

function dayNum(iso: string) {
  return Number(iso.split('-')[2]?.slice(0, 2)) || '';
}

function formatTime(value: string) {
  const [hourText, minute = '00'] = value.split(':');
  const hour = Number(hourText);
  if (!Number.isFinite(hour)) return value;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${suffix}`;
}
