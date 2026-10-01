'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Chip } from '@/components/Ui';
import { PinIcon } from '@/components/Icons';
import { ANALYTICS_EVENTS, track } from '@/lib/analytics';
import { neighborhoodName } from '@/lib/content/neighborhoods';
import { ANY_AREA, FINDER_EVENT_TYPES, MAX_PRIORITIES, PRIORITIES, browseVenues, finderEventType, finderParams, recommend, sizesFor, type FinderInput, type FinderVenue, type Priority, type VenueFit } from '@/lib/events/finder';
import { OWNED_VENUE_DISCLOSURE, VENUE_KIND_LABEL, briefHref, withShortlist } from '@/lib/private-events';
import { ShortlistButton } from './Shortlist';

/** A venue as the grid card shows it: the finder facts plus what the server resolved for display. */
export interface BrowserVenue extends FinderVenue {
  summary: string;
  image: { src: string; srcSet?: string; alt: string } | null;
  capacity: { seated: number; standing: number };
  /** "$$ to $$$$$", from the spaces' price bands; never a number. */
  bandRange?: string;
  sponsored: boolean;
}

const DEBOUNCE_MS = 200;

/** Chip text in the one-row bar; the full label is the control's accessible name and its title. */
const SHORT_LABEL: Record<Priority, string> = { food: 'Food & drinks', music: 'Live music', talk: 'Room to talk', skyline: 'Rooftop', av: 'AV', logistics: 'Logistics' };

/**
 * One section, not two: a filter bar directly above the venue grid, and
 * the grid is the recommendation. Filters apply on change (debounced) and
 * mirror into the URL (`event`, `size`, `area`, `pri`), so the brief and
 * the shortlist bar see the same state. Venues with no matching space
 * fade to the end instead of disappearing. The prose recommendation
 * (format, area, why, plan for) sits under the grid, collapsed.
 */
export default function VenueBrowser({ venues, initial, shortlist, areas }: { venues: BrowserVenue[]; initial: FinderInput; shortlist: string[]; areas: { slug: string; name: string }[] }) {
  const [eventType, setEventType] = useState<string>(initial.eventType ?? '');
  const [size, setSize] = useState<string>(initial.size ?? '');
  const [area, setArea] = useState<string>(initial.area ?? ANY_AREA);
  const [priorities, setPriorities] = useState<Priority[]>(initial.priorities);
  const typeDef = finderEventType(eventType);
  const sizes = sizesFor(typeDef?.value);

  const input: FinderInput = useMemo(() => ({ eventType: typeDef?.value, size: size || undefined, area: area || ANY_AREA, priorities }), [typeDef, size, area, priorities]);
  const [applied, setApplied] = useState<FinderInput>(input);
  const first = useRef(true);

  // Debounce: the grid, the URL and the analytics event follow a short pause, not every keystroke on a select.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setApplied(input);
      const sp = new URLSearchParams(window.location.search);
      for (const k of ['event', 'size', 'area', 'pri']) sp.delete(k);
      finderParams(input).forEach((v, k) => sp.set(k, v));
      const qs = sp.toString();
      const next = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`;
      // Next.js patches replaceState so useSearchParams elsewhere (the shortlist bar) sees the change; pass null state so it does.
      if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) window.history.replaceState(null, '', next);
      if (first.current) {
        first.current = false;
        return;
      }
      track(ANALYTICS_EVENTS.EVENTS_FILTERS_CHANGED, { occasion: input.eventType, guests_band: input.size, neighborhood: input.area, priorities: input.priorities.join(',') });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [input]);

  const rows = useMemo(() => browseVenues(applied, venues), [applied, venues]);
  const fitting = rows.filter((r) => r.fits);
  const spaceCount = fitting.reduce((n, r) => n + r.spaces, 0);
  const anyFilter = Boolean(applied.eventType || applied.size || (applied.area && applied.area !== ANY_AREA) || applied.priorities.length);
  const notes = useMemo(() => (applied.eventType ? recommend(applied, venues) : null), [applied, venues]);
  const byId = new Map(venues.map((v) => [v.slug, v]));
  const briefLink = briefHref({ event: applied.eventType, size: applied.size, area: applied.area, priorities: applied.priorities, occasion: typeDef?.occasion, shortlist });

  function onEventType(value: string) {
    setEventType(value);
    if (size && !sizesFor(finderEventType(value)?.value).some((b) => b.slug === size)) setSize('');
  }
  function togglePriority(p: Priority) {
    setPriorities((list) => (list.includes(p) ? list.filter((x) => x !== p) : list.length >= MAX_PRIORITIES ? list : [...list, p]));
  }
  function reset() {
    setEventType('');
    setSize('');
    setArea(ANY_AREA);
    setPriorities([]);
  }

  const promoted = FINDER_EVENT_TYPES.filter((t) => t.promoted);
  const secondary = FINDER_EVENT_TYPES.filter((t) => !t.promoted);
  const full = priorities.length >= MAX_PRIORITIES;
  const select = 'field-input min-h-11 py-2';

  return (
    <div>
      {/* Filter bar: one row on desktop, two on phones. No submit; changes apply after a short pause. */}
      <form onSubmit={(e) => e.preventDefault()} aria-label="Filter venues" className="grid gap-3 rounded-card border border-paper-edge bg-paper p-3 lg:grid-cols-[150px_130px_160px_minmax(0,1fr)_auto] lg:items-end">
        <div>
          <label htmlFor="filter-event" className="field-label mb-1 text-2xs uppercase tracking-[0.14em] text-ink-soft">
            Event type
          </label>
          <select id="filter-event" name="event" value={eventType} onChange={(e) => onEventType(e.target.value)} className={select}>
            <option value="">Any event type</option>
            <optgroup label="Most common">
              {promoted.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Other occasions">
              {secondary.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
        <div>
          <label htmlFor="filter-size" className="field-label mb-1 text-2xs uppercase tracking-[0.14em] text-ink-soft">
            Group size
          </label>
          <select id="filter-size" name="size" value={size} onChange={(e) => setSize(e.target.value)} className={select}>
            <option value="">Any size</option>
            {sizes.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.label} guests
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter-area" className="field-label mb-1 text-2xs uppercase tracking-[0.14em] text-ink-soft">
            Area
          </label>
          <select id="filter-area" name="area" value={area} onChange={(e) => setArea(e.target.value)} className={select}>
            <option value={ANY_AREA}>Open to the best fit</option>
            {areas.map((n) => (
              <option key={n.slug} value={n.slug}>
                {n.name}
              </option>
            ))}
          </select>
        </div>
        <fieldset className="min-w-0">
          <legend className="field-label mb-1 text-2xs uppercase tracking-[0.14em] text-ink-soft">
            Priorities <span className="normal-case tracking-normal">(up to {MAX_PRIORITIES})</span>
          </legend>
          <ul className="flex flex-wrap gap-1">
            {PRIORITIES.map((p) => {
              const on = priorities.includes(p.value);
              const disabled = !on && full;
              return (
                <li key={p.value}>
                  <label title={p.label} className={`inline-flex min-h-9 cursor-pointer items-center gap-1 whitespace-nowrap rounded border px-2 text-[12px] transition-colors focus-within:ring-2 focus-within:ring-ink focus-within:ring-offset-2 focus-within:ring-offset-paper ${on ? 'border-ink bg-ink font-semibold text-paper' : disabled ? 'cursor-not-allowed border-paper-edge text-ink-faint' : 'border-paper-edge bg-paper text-ink hover:border-ink'}`}>
                    <input type="checkbox" name="pri" value={p.value} checked={on} disabled={disabled} onChange={() => togglePriority(p.value)} className="sr-only" aria-label={p.label} />
                    <span aria-hidden="true">{on ? '✓' : '+'}</span>
                    <span aria-hidden="true">{SHORT_LABEL[p.value]}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
        <div className="flex min-h-11 items-center lg:justify-end">
          <button type="button" onClick={reset} disabled={!anyFilter && !eventType && !size && !priorities.length && area === ANY_AREA} className="text-sm font-semibold text-ink underline underline-offset-[0.2em] disabled:text-ink-faint disabled:no-underline">
            Reset
          </button>
        </div>
      </form>
      <p className="mt-1.5 text-2xs text-ink-soft">No contact details needed; the grid updates as you choose.</p>

      {/* The grid. */}
      <ul className="mt-4 grid gap-5 md:grid-cols-2" aria-label="Venues">
        {rows.map((r) => (
          <li key={r.venue.slug}>
            <VenueCard row={r} venue={byId.get(r.venue.slug)!} shortlist={shortlist} filtered={anyFilter} />
          </li>
        ))}
      </ul>

      <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-paper-edge pt-4 text-[15px] text-ink" aria-live="polite">
        <span>
          <strong className="font-semibold">{fitting.length}</strong> {fitting.length === 1 ? 'venue' : 'venues'} · <strong className="font-semibold">{spaceCount}</strong> {spaceCount === 1 ? 'space fits' : 'spaces fit'} this brief
        </span>
        <span aria-hidden="true">·</span>
        <Link href={briefLink} className="inline-flex min-h-11 items-center gap-1.5 font-semibold underline underline-offset-[0.2em]">
          Build my inquiry
          <span aria-hidden="true">→</span>
        </Link>
      </p>

      {notes ? (
        <details className="mt-4 rounded-card border border-paper-edge bg-paper">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 font-sans text-[15px] font-semibold text-ink [&::-webkit-details-marker]:hidden">
            Planning notes for this brief
            <span aria-hidden="true" className="text-ink-soft">
              +
            </span>
          </summary>
          <div className="grid gap-5 border-t border-paper-edge px-4 py-4 sm:grid-cols-2">
            <div>
              <p className="eyebrow">Recommended format</p>
              <p className="mt-1 font-sans text-[16px] font-bold text-ink">{notes.format.title}</p>
              <p className="mt-1 text-[14px] leading-relaxed text-ink-soft">{notes.format.body}</p>
            </div>
            <div>
              <p className="eyebrow">Suggested area</p>
              <p className="mt-1 font-sans text-[16px] font-bold text-ink">
                {notes.area.name}
                {notes.area.chosen ? <span className="ml-2 text-sm font-normal text-ink-soft">(your choice)</span> : null}
              </p>
              <p className="mt-1 text-[14px] leading-relaxed text-ink-soft">{notes.area.body}</p>
            </div>
            <div>
              <p className="eyebrow">Why it fits</p>
              <ul className="mt-1 grid gap-1.5 text-[14px] leading-snug text-ink">
                {notes.why.map((w) => (
                  <li key={w} className="flex gap-2">
                    <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />
                    {w}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="eyebrow">Plan for</p>
              <ul className="mt-1 grid gap-1.5 text-[14px] leading-snug text-ink">
                {notes.considerations.map((c) => (
                  <li key={c} className="flex gap-2">
                    <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-soft" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </details>
      ) : null}
    </div>
  );
}

function VenueCard({ row, venue, shortlist, filtered }: { row: VenueFit; venue: BrowserVenue; shortlist: string[]; filtered: boolean }) {
  const href = withShortlist(`/private-events/venues/${venue.slug}/`, shortlist);
  const faded = filtered && !row.fits;
  return (
    <article className={`flex h-full flex-col overflow-hidden rounded-card border border-paper-edge bg-paper transition-opacity motion-safe:duration-200 ${faded ? 'opacity-60' : 'hover:border-ink'}`} aria-labelledby={`venue-${venue.slug}`}>
      <div className="aspect-[3/2] w-full bg-ink">
        {venue.image ? (
          // Venue-supplied or BPH-owned registry photo, resolved on the server; provider-hosted URLs stay plain img elements.
          <img src={venue.image.src} srcSet={venue.image.srcSet} sizes="(max-width: 767px) 100vw, 50vw" alt={venue.image.alt} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-paper/70">Photography on the way</div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <h3 id={`venue-${venue.slug}`} className="font-display text-[1.375rem] font-extrabold leading-tight tracking-[-0.03em] text-ink">
            <Link href={href} className="hover:underline">
              {venue.name}
            </Link>
          </h3>
          {faded ? <span className="rounded border border-paper-edge bg-paper-sunk px-2 py-0.5 text-2xs font-semibold uppercase tracking-[0.14em] text-ink-soft">Doesn&rsquo;t fit this brief</span> : null}
        </div>
        <p className="eyebrow mt-1 inline-flex flex-wrap items-center gap-x-2">
          <span>{VENUE_KIND_LABEL[venue.kind]}</span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <PinIcon size={12} />
            {neighborhoodName(venue.neighborhoodSlug)}
          </span>
        </p>
        <p className="mt-2 text-[15px] text-ink">
          {venue.capacity.seated ? `Seats up to ${venue.capacity.seated.toLocaleString('en-US')}` : 'Seated capacity on request'} <span className="text-ink-soft">·</span> {venue.capacity.standing ? `standing up to ${venue.capacity.standing.toLocaleString('en-US')}` : 'standing on request'}
        </p>
        <p className="mt-0.5 text-[15px] text-ink">
          {venue.bandRange ? (
            <>
              <strong className="font-semibold tracking-[0.06em]">{venue.bandRange}</strong> <span className="text-ink-soft">minimum spend across its spaces</span>
            </>
          ) : (
            <span className="text-ink-soft">Price band on request</span>
          )}
          {filtered && row.fits ? (
            <span className="text-ink-soft">
              {' '}
              · {row.spaces} {row.spaces === 1 ? 'space fits' : 'spaces fit'}
            </span>
          ) : null}
        </p>
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Labels">
          {venue.verified ? (
            <li>
              <Chip>Verified by Nashville.com</Chip>
            </li>
          ) : null}
          {venue.ownedByBph ? (
            <li>
              <Chip>{OWNED_VENUE_DISCLOSURE.split('.')[0]}</Chip>
            </li>
          ) : null}
          {venue.sponsored ? (
            <li>
              <Chip>Sponsored placement</Chip>
            </li>
          ) : null}
          {row.meets.map((p) => (
            <li key={p}>
              <Chip>✓ {PRIORITIES.find((d) => d.value === p)?.label}</Chip>
            </li>
          ))}
        </ul>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
          <Link href={href} className="inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-ink underline-offset-[0.2em] hover:underline">
            View spaces
            <span aria-hidden="true">→</span>
          </Link>
          <ShortlistButton slug={venue.slug} name={venue.name} compact />
        </div>
      </div>
    </article>
  );
}
