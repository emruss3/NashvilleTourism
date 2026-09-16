'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import { ANALYTICS_EVENTS, track } from '@/lib/analytics';
import type { LiveEvent } from '@/lib/feeds/ticketmaster';
import { formatDay } from '@/lib/explore';

/**
 * "On the calendar." list (SITE-LAYOUT.md §Events and merchandise).
 * Tabs All / Music / Arts / Food / Culture over the live calendar, three to
 * four entries, then "See all events". Titles link to the ticket page; there
 * are no nested controls. Never fabricates entries: with no live feed the
 * caller renders the honest unavailable state instead of this list.
 */

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'music', label: 'Music' },
  { key: 'arts', label: 'Arts' },
  { key: 'food', label: 'Food' },
  { key: 'culture', label: 'Culture' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

function tabOf(event: LiveEvent): Exclude<TabKey, 'all'> {
  const segment = (event.segment || '').toLowerCase();
  const genre = (event.genre || '').toLowerCase();
  if (segment.includes('music')) return 'music';
  if (segment.includes('arts') || segment.includes('theat')) return 'arts';
  if (genre.includes('food') || genre.includes('drink') || genre.includes('culinary')) return 'food';
  return 'culture';
}

function monthAbbr(iso: string) {
  return formatDay(iso).split(' ')[0];
}
function dayNum(iso: string) {
  return formatDay(iso).split(' ')[1];
}
function formatTime(value?: string) {
  if (!value) return '';
  const [h, m = '00'] = value.split(':');
  const hour = Number(h);
  if (!Number.isFinite(hour)) return value;
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

export default function EventList({ events, limit = 4 }: { events: LiveEvent[]; limit?: number }) {
  const [tab, setTab] = useState<TabKey>('all');
  const baseId = useId();
  const filtered = tab === 'all' ? events : events.filter((e) => tabOf(e) === tab);
  const shown = filtered.slice(0, limit);

  return (
    <div>
      <div role="tablist" aria-label="Event categories" className="flex flex-wrap gap-1 border-b border-paper-edge">
        {TABS.map((t) => {
          const selected = t.key === tab;
          return (
            <button
              key={t.key}
              role="tab"
              id={`${baseId}-tab-${t.key}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setTab(t.key)}
              onKeyDown={(e) => {
                const i = TABS.findIndex((x) => x.key === tab);
                if (e.key === 'ArrowRight') setTab(TABS[(i + 1) % TABS.length].key);
                if (e.key === 'ArrowLeft') setTab(TABS[(i - 1 + TABS.length) % TABS.length].key);
              }}
              className={`-mb-px inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-semibold transition-colors ${
                selected ? 'border-ink text-ink' : 'border-transparent text-ink-soft hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div id={`${baseId}-panel`} role="tabpanel" aria-labelledby={`${baseId}-tab-${tab}`}>
        {shown.length === 0 ? (
          <p className="py-8 text-[15px] text-ink-soft">No events match those filters. Try another date or neighborhood.</p>
        ) : (
          <ul className="divide-y divide-paper-edge">
            {shown.map((event) => {
              const external = /^https?:\/\//i.test(event.ticketUrl);
              const price =
                typeof event.priceFrom === 'number'
                  ? `From ${new Intl.NumberFormat('en-US', { style: 'currency', currency: event.currency || 'USD', maximumFractionDigits: 0 }).format(event.priceFrom)}`
                  : null;
              const titleClass = 'text-[17px] font-bold leading-snug text-ink underline-offset-[0.2em] hover:underline';
              return (
                <li key={`${event.source}-${event.id}`} className="flex gap-3 py-4 sm:gap-4">
                  {event.imageUrl && !event.imageIsFallback ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={event.imageUrl}
                      alt=""
                      width={96}
                      height={64}
                      loading="lazy"
                      decoding="async"
                      className="hidden h-16 w-24 shrink-0 rounded-card object-cover sm:block"
                    />
                  ) : null}
                  <div className="flex w-12 shrink-0 flex-col items-center justify-center text-center">
                    <span className="text-2xs font-semibold uppercase tracking-[0.14em] text-ink">{monthAbbr(event.date)}</span>
                    <span className="text-2xl font-bold leading-none text-ink">{dayNum(event.date)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-sans text-[17px] font-bold">
                      {external ? (
                        <a
                          href={event.ticketUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={titleClass}
                          onClick={() =>
                            track(ANALYTICS_EVENTS.TICKET_AFFILIATE_CLICKED, {
                              item_id: event.id,
                              partner: 'ticketmaster',
                              placement: 'affiliate',
                            })
                          }
                        >
                          {event.name}
                        </a>
                      ) : (
                        <Link href={event.ticketUrl} className={titleClass}>
                          {event.name}
                        </Link>
                      )}
                    </h3>
                    <p className="mt-0.5 text-sm text-ink-soft">
                      {event.venue}
                      {event.time ? ` · ${formatTime(event.time)}` : ''}
                      {price ? ` · ${price}` : ''}
                    </p>
                    {(event.segment || event.genre) && (
                      <p className="mt-1.5 flex flex-wrap gap-1.5">
                        {[event.segment, event.genre]
                          .filter((v, i, arr): v is string => Boolean(v) && arr.indexOf(v) === i)
                          .map((tag) => (
                            <span key={tag} className="rounded border border-paper-edge px-1.5 py-0.5 text-2xs font-medium text-ink-soft">
                              {tag}
                            </span>
                          ))}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
