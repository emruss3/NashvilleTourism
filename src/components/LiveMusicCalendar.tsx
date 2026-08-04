'use client';

import { useMemo, useState } from 'react';
import type { LiveEvent } from '@/lib/feeds/ticketmaster';
import { ANALYTICS_EVENTS, track } from '@/lib/analytics';
import { EmptyState } from './Ui';
import { formatDateShort } from './Trust';

type SortKey = 'date' | 'name' | 'venue' | 'price';

/**
 * Sortable, filterable show directory. This is the page people are meant to
 * bookmark, so filtering is instant and entirely client-side.
 */
export default function LiveMusicCalendar({
  events,
  genres,
  venues,
  live,
}: {
  events: LiveEvent[];
  genres: string[];
  venues: string[];
  live: boolean;
}) {
  const [genre, setGenre] = useState('All');
  const [venue, setVenue] = useState('All');
  const [when, setWhen] = useState<'all' | 'today' | 'weekend' | 'week'>('all');
  const [sort, setSort] = useState<SortKey>('date');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const today = new Date();
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const todayStr = iso(today);

    // Friday through Sunday of the current week.
    const dow = today.getDay();
    const friOffset = (5 - dow + 7) % 7;
    const fri = new Date(today); fri.setDate(today.getDate() + friOffset);
    const sun = new Date(fri); sun.setDate(fri.getDate() + 2);
    const weekEnd = new Date(today); weekEnd.setDate(today.getDate() + 7);

    let list = events.filter((e) => {
      if (genre !== 'All' && e.genre !== genre) return false;
      if (venue !== 'All' && e.venue !== venue) return false;
      if (when === 'today' && e.date !== todayStr) return false;
      if (when === 'weekend' && (e.date < iso(fri) || e.date > iso(sun))) return false;
      if (when === 'week' && (e.date < todayStr || e.date > iso(weekEnd))) return false;
      if (q.trim()) {
        const s = `${e.name} ${e.venue} ${e.genre ?? ''}`.toLowerCase();
        if (!s.includes(q.trim().toLowerCase())) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'venue') return a.venue.localeCompare(b.venue) || a.date.localeCompare(b.date);
      if (sort === 'price') return (a.priceFrom ?? 1e9) - (b.priceFrom ?? 1e9);
      return a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? '');
    });
    return list;
  }, [events, genre, venue, when, sort, q]);

  const reset = () => { setGenre('All'); setVenue('All'); setWhen('all'); setQ(''); };

  return (
    <div>
      {/* Filter bar */}
      <div className="sticky top-16 z-30 -mx-5 border-y border-paper-edge bg-paper/95 px-5 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[180px] flex-1">
            <label htmlFor="lm-q" className="mb-1 block text-2xs font-bold uppercase tracking-wider text-ink-faint">
              Search
            </label>
            <input
              id="lm-q"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Artist or venue"
              className="field-input py-2"
            />
          </div>
          <div>
            <label htmlFor="lm-when" className="mb-1 block text-2xs font-bold uppercase tracking-wider text-ink-faint">
              When
            </label>
            <select id="lm-when" value={when} onChange={(e) => setWhen(e.target.value as typeof when)} className="field-input py-2">
              <option value="all">Any date</option>
              <option value="today">Tonight</option>
              <option value="weekend">This weekend</option>
              <option value="week">Next 7 days</option>
            </select>
          </div>
          <div>
            <label htmlFor="lm-genre" className="mb-1 block text-2xs font-bold uppercase tracking-wider text-ink-faint">
              Genre
            </label>
            <select id="lm-genre" value={genre} onChange={(e) => setGenre(e.target.value)} className="field-input py-2">
              <option>All</option>
              {genres.map((g) => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="lm-venue" className="mb-1 block text-2xs font-bold uppercase tracking-wider text-ink-faint">
              Venue
            </label>
            <select id="lm-venue" value={venue} onChange={(e) => setVenue(e.target.value)} className="field-input py-2">
              <option>All</option>
              {venues.map((v) => <option key={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="lm-sort" className="mb-1 block text-2xs font-bold uppercase tracking-wider text-ink-faint">
              Sort by
            </label>
            <select id="lm-sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="field-input py-2">
              <option value="date">Date</option>
              <option value="name">Artist</option>
              <option value="venue">Venue</option>
              <option value="price">Price</option>
            </select>
          </div>
        </div>
        <p role="status" className="mt-2 text-2xs text-ink-faint">
          {filtered.length} {filtered.length === 1 ? 'show' : 'shows'}
          {!live && ' · sample data, connect a feed for live listings'}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="py-10">
          <EmptyState
            title="No shows match those filters"
            description="Try widening the date range or clearing the genre and venue filters."
            action={<button type="button" onClick={reset} className="btn-primary">Clear filters</button>}
          />
        </div>
      ) : (
        <ul className="divide-y divide-paper-edge border-b border-paper-edge">
          {filtered.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-4 py-4">
              <div className="flex w-14 shrink-0 flex-col items-center rounded border border-paper-edge bg-paper-sunk py-1.5 text-center">
                <span className="text-2xs font-bold uppercase tracking-wider text-clay">
                  {formatDateShort(e.date).split(' ')[0]}
                </span>
                <span className="font-display text-xl font-bold leading-none text-ink">
                  {e.date.slice(8, 10)}
                </span>
              </div>

              <div className="min-w-[200px] flex-1">
                <p className="font-display text-lg leading-snug text-ink">{e.name}</p>
                <p className="text-sm text-ink-faint">
                  {e.venue}
                  {e.time ? ` · ${e.time}` : ''}
                  {e.genre ? ` · ${e.genre}` : ''}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {typeof e.priceFrom === 'number' && (
                  <span className="text-sm font-semibold text-ink-soft">
                    from {e.currency === 'USD' ? '$' : ''}{e.priceFrom}
                  </span>
                )}
                <a
                  href={e.ticketUrl}
                  target={e.ticketUrl.startsWith('http') ? '_blank' : undefined}
                  rel={e.ticketUrl.startsWith('http') ? 'noopener noreferrer sponsored' : undefined}
                  onClick={() =>
                    track(ANALYTICS_EVENTS.TICKET_AFFILIATE_CLICKED, {
                      item_id: e.id,
                      item_name: e.name,
                      partner: e.source === 'ticketmaster' ? 'Ticketmaster' : 'internal',
                      placement: 'affiliate',
                    })
                  }
                  className="btn-primary whitespace-nowrap py-2 text-sm"
                >
                  Tickets
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
