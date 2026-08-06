import Link from 'next/link';
import { SmartImage } from '@/components/Media';
import { neighborhoodName } from '@/lib/content/neighborhoods';
import type { NashvilleEvent } from '@/lib/types';
import type { ImageKey } from '@/lib/media';

function monthAbbr(iso: string) {
  const m = Number(iso.split('-')[1]);
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1] ?? '';
}

function dayNum(iso: string) {
  return Number(iso.split('-')[2]?.slice(0, 2)) || '';
}

function featureImageFor(event: NashvilleEvent): ImageKey {
  if (event.category === 'Sports') return 'hub/tickets';
  if (event.category === 'Free' || event.category === 'Family') return 'hub/weekend';
  if (event.category === 'Food & Drink') return 'hub/restaurants';
  return 'hub/live-music';
}

export default function NashvilleThisWeek({ events }: { events: NashvilleEvent[] }) {
  const [feature, ...rest] = events;
  const list = rest.slice(0, 4);

  if (!feature) return null;

  return (
    <section className="border-y border-paper-edge bg-paper-card py-14 lg:py-16">
      <div className="shell">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-sans text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Nashville This Week
          </h2>
          <Link
            href="/events/"
            className="text-sm font-semibold text-clay transition-colors hover:text-clay-deep"
          >
            View all events →
          </Link>
        </div>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
          <Link
            href={`/events/${feature.slug}/`}
            className="group block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
          >
            <div className="overflow-hidden rounded-card">
              <SmartImage
                imageKey={featureImageFor(feature)}
                ratio="aspect-[16/10]"
                className="transition-transform duration-500 group-hover:scale-[1.02]"
                sizes="(max-width: 1023px) 100vw, 55vw"
                showCredit={false}
              />
            </div>
            <p className="mt-4 text-2xs font-bold uppercase tracking-wider text-clay">
              {feature.category} · {monthAbbr(feature.startDate)} {dayNum(feature.startDate)}
            </p>
            <h3 className="mt-1.5 font-sans text-2xl font-bold leading-snug text-ink group-hover:text-clay sm:text-3xl">
              {feature.title}
            </h3>
            <p className="mt-2 max-w-prose text-body text-ink-soft">{feature.summary}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
              Event details
              <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </span>
          </Link>

          <div>
            <ul className="divide-y divide-paper-edge">
              {list.map((event) => (
                <li key={event.slug}>
                  <Link
                    href={`/events/${event.slug}/`}
                    className="group flex gap-4 py-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
                  >
                    <div className="flex w-12 shrink-0 flex-col items-center justify-center text-center">
                      <span className="text-2xs font-bold uppercase tracking-wider text-clay">
                        {monthAbbr(event.startDate)}
                      </span>
                      <span className="text-xl font-bold leading-none text-ink">
                        {dayNum(event.startDate)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-sans text-base font-bold leading-snug text-ink group-hover:text-clay">
                        {event.title}
                      </h3>
                      <p className="mt-0.5 text-sm text-ink-faint">
                        {event.venue}
                        {event.neighborhood ? ` · ${neighborhoodName(event.neighborhood)}` : ''}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-2 border-t border-paper-edge pt-4">
              <Link href="/events/" className="text-sm font-semibold text-ink hover:text-clay">
                View all events →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
