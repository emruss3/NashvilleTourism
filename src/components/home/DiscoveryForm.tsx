'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { ANALYTICS_EVENTS, track } from '@/lib/analytics';
import { INTERESTS, WHEN_OPTIONS, exploreHref, neighborhoodOptions, type ExploreQuery } from '@/lib/explore';

/**
 * Discovery module, rendered once and styled for both layouts.
 *
 * Phones (MOBILE-FIRST.md §Homepage 3): a visible search field with its own
 * Go button, the quick links Tonight / Tomorrow / This weekend / Next 7 days,
 * and a "More options" toggle that reveals neighborhood, interest and when.
 *
 * Desktop (SITE-LAYOUT.md §Discovery band): one row of labelled fields on the
 * black band: Search, Neighborhood, Interest, When, then the "Find your
 * plans" button. Every field carries a visible label so nothing depends on a
 * clipped placeholder, and "When" is a single select (Any time, Tonight,
 * Tomorrow, This weekend, Next 7 days, Pick dates) instead of two bare date
 * inputs; picking dates reveals the From / To fields beneath the row.
 *
 * A plain GET form to /explore/, so selections live in the URL and survive
 * Back and reload. Tonight and This weekend resolve in America/Chicago at
 * request time; explicit dates replace a shortcut and vice versa.
 */
const PICK_DATES = 'dates';

export default function DiscoveryForm({
  initial,
  variant = 'home',
}: {
  initial?: Partial<ExploreQuery>;
  /** `explore` keeps the panel open at every width and uses the light styling. */
  variant?: 'home' | 'explore';
}) {
  const hasDates = Boolean(initial?.from || initial?.to);
  const hasDetail = hasDates || Boolean(initial?.neighborhood || initial?.interest || initial?.when);
  const [open, setOpen] = useState(variant === 'explore' || hasDetail);
  const [when, setWhen] = useState<string>(hasDates ? PICK_DATES : initial?.when ?? '');
  const panelId = useId();
  const datesId = useId();
  const router = useRouter();
  const dark = variant === 'home';
  const pickingDates = when === PICK_DATES;

  const label = `mb-1 block text-2xs font-semibold uppercase tracking-[0.14em] ${dark ? 'text-ink-soft md:text-paper/75' : 'text-ink-soft'}`;
  const field = dark
    ? 'field-input md:h-[52px] md:text-base md:border-paper/50 md:bg-transparent md:text-paper md:placeholder:text-paper/65 md:focus:border-paper md:focus-visible:outline-paper md:[color-scheme:dark]'
    : 'field-input';
  const withIcon = 'md:pl-10';
  const iconClass = `pointer-events-none absolute left-3 top-[calc(50%+0.625rem)] hidden -translate-y-1/2 md:block ${dark ? 'text-paper/70' : 'text-ink-soft'}`;
  const quick = dark
    ? 'inline-flex min-h-11 items-center text-[15px] font-semibold text-ink underline-offset-[0.2em] md:min-h-8 md:text-sm md:text-paper'
    : 'inline-flex min-h-11 items-center text-[15px] font-semibold text-ink underline-offset-[0.2em]';

  // Progressive enhancement: with JS, drop empty fields so the URL only
  // carries real filters. Without JS the native GET submit still works and
  // /explore/ ignores a `when` of "dates" as an unknown value.
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    for (const [key, value] of data.entries()) {
      if (typeof value === 'string' && value.trim()) params.set(key, value.trim());
    }
    if (params.get('when') === PICK_DATES) params.delete('when');
    // A shortcut and explicit dates never travel together.
    if (params.has('when')) {
      params.delete('from');
      params.delete('to');
    }
    track(ANALYTICS_EVENTS.DISCOVERY_SUBMITTED, {
      item_type: params.get('interest') || undefined,
      neighborhood: params.get('neighborhood') || undefined,
      // Date window type only; never the raw query text.
      value: params.has('from') || params.has('to') ? 1 : 0,
    });
    const qs = params.toString();
    router.push(qs ? `/explore/?${qs}` : '/explore/');
  }

  const panelOpen = open || variant === 'explore';

  return (
    <form action="/explore/" method="get" onSubmit={onSubmit} role="search" aria-label="Find shows, places and neighborhoods">
      <div className="lg:grid lg:grid-cols-[1.45fr_1fr_1.15fr_1fr_auto] lg:items-end lg:gap-4">
        <div className="relative">
          <label htmlFor="explore-q" className={`${label} sr-only md:not-sr-only`}>
            Search
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className={`${iconClass} !top-1/2`} aria-hidden="true">
                <SearchIcon />
              </span>
              <input
                id="explore-q"
                name="q"
                type="search"
                defaultValue={initial?.q ?? ''}
                placeholder="Shows, places, neighborhoods"
                autoComplete="off"
                enterKeyHint="search"
                className={`${field} ${withIcon}`}
              />
            </div>
            <button type="submit" className="btn-primary shrink-0 px-4 lg:hidden">
              <span aria-hidden="true">→</span>
              <span className="sr-only">Find your plans</span>
            </button>
          </div>
        </div>

        {/* On phones this is the collapsible panel; on desktop `contents` lets its fields join the band row. */}
        <div
          id={panelId}
          className={`${panelOpen ? 'grid' : 'hidden'} mt-3 gap-3 rounded-card border border-paper-edge bg-paper-sunk p-4 sm:grid-cols-2 md:border-paper/30 md:bg-transparent md:p-0 lg:contents`}
        >
          <div className="relative">
            <label htmlFor="explore-neighborhood" className={label}>
              Neighborhood
            </label>
            <span className={iconClass} aria-hidden="true">
              <PinIcon />
            </span>
            <select id="explore-neighborhood" name="neighborhood" defaultValue={initial?.neighborhood ?? ''} className={`${field} ${withIcon}`}>
              <option value="">All Nashville</option>
              {neighborhoodOptions().map((n) => (
                <option key={n.value} value={n.value}>
                  {n.label}
                </option>
              ))}
            </select>
          </div>
          <div className="relative">
            <label htmlFor="explore-interest" className={label}>
              Interest
            </label>
            <span className={iconClass} aria-hidden="true">
              <NoteIcon />
            </span>
            <select id="explore-interest" name="interest" defaultValue={initial?.interest ?? ''} className={`${field} ${withIcon}`}>
              <option value="">Anything</option>
              {INTERESTS.map((i) => (
                <option key={i.value} value={i.value}>
                  {i.label}
                </option>
              ))}
            </select>
          </div>
          <div className="relative">
            <label htmlFor="explore-when" className={label}>
              When
            </label>
            <span className={iconClass} aria-hidden="true">
              <CalendarIcon />
            </span>
            <select
              id="explore-when"
              name="when"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              aria-controls={datesId}
              aria-expanded={pickingDates}
              className={`${field} ${withIcon}`}
            >
              <option value="">Any time</option>
              {WHEN_OPTIONS.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
              <option value={PICK_DATES}>Pick dates…</option>
            </select>
          </div>
          {/* Explicit dates, shown only after "Pick dates…" so the row stays one line. Wrapped in the panel so phones get it too. */}
          <div
            id={datesId}
            className={`${pickingDates ? 'grid' : 'hidden'} grid-cols-2 gap-3 sm:col-span-2 lg:order-last lg:col-span-5 lg:max-w-md lg:pb-1`}
          >
            <div>
              <label htmlFor="explore-from" className={label}>
                From
              </label>
              <input
                id="explore-from"
                name="from"
                type="date"
                defaultValue={initial?.from ?? ''}
                disabled={!pickingDates}
                className={field}
              />
            </div>
            <div>
              <label htmlFor="explore-to" className={label}>
                To
              </label>
              <input id="explore-to" name="to" type="date" defaultValue={initial?.to ?? ''} disabled={!pickingDates} className={field} />
            </div>
          </div>
          <div className="sm:col-span-2 lg:col-span-1">
            <button type="submit" className={dark ? 'btn-reverse hidden w-full md:inline-flex md:h-[52px] md:w-auto md:px-8 md:text-base' : 'btn-primary w-full lg:w-auto'}>
              Find your plans
              <span aria-hidden="true">→</span>
            </button>
            {dark ? (
              <button type="submit" className="btn-primary w-full md:hidden">
                Find your plans
              </button>
            ) : null}
          </div>

        </div>
      </div>

      {/* Quick links stay on phones and on the Explore page; the desktop home band is the one labelled row the board shows (the calendar module carries the date shortcuts). */}
      <div className={`mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 ${dark ? 'lg:hidden' : 'lg:mt-2'}`}>
        <span className={`text-2xs font-semibold uppercase tracking-[0.14em] ${dark ? 'text-ink-soft md:text-paper/70' : 'text-ink-soft'}`}>
          Quick
        </span>
        {WHEN_OPTIONS.map((w) => (
          <Link
            key={w.value}
            href={exploreHref({ when: w.value, neighborhood: initial?.neighborhood, interest: initial?.interest, q: initial?.q })}
            className={`${quick} ${initial?.when === w.value ? 'underline' : 'hover:underline'}`}
            aria-current={initial?.when === w.value ? 'true' : undefined}
          >
            {w.label}
          </Link>
        ))}
        {variant === 'home' ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((v) => !v)}
            className={`${quick} gap-1.5 hover:underline lg:hidden`}
          >
            More options
            <span aria-hidden="true" className={`text-xs transition-transform ${open ? 'rotate-180' : ''}`}>
              ▾
            </span>
          </button>
        ) : null}
      </div>
    </form>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.8" />
      <path d="m13.5 13.5 3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 1.5c-2.2 0-4 1.8-4 4 0 3 4 9 4 9s4-6 4-9c0-2.2-1.8-4-4-4Z" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8" cy="5.5" r="1.4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
function NoteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6 12.5V3.5l7-1.5v9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="4" cy="12.5" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="11" cy="11.5" r="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="3.5" width="12" height="10.5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 7h12M5.5 2v3M10.5 2v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
