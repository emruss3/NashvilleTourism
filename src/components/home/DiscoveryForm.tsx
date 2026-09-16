'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { ANALYTICS_EVENTS, track } from '@/lib/analytics';
import { INTERESTS, WHEN_OPTIONS, exploreHref, neighborhoodOptions, type ExploreQuery } from '@/lib/explore';

/**
 * Discovery module, rendered once and styled for both layouts:
 *
 * Phones (MOBILE-FIRST.md §Homepage 3): a visible search field, the quick
 * links Tonight / This weekend, and a "Choose dates" toggle that reveals
 * neighborhood, interest and dates.
 *
 * Desktop (SITE-LAYOUT.md §Discovery band): the same controls as one
 * charcoal band of icon-led fields (search, Neighborhood, Interest, Dates)
 * and a Paper White "Find your plans" button. The panel is always open.
 *
 * A plain GET form to /explore/, so selections live in the URL and survive
 * Back and reload. Dates default to unset; Tonight and This weekend resolve
 * in America/Chicago at request time.
 */
export default function DiscoveryForm({
  initial,
  variant = 'home',
}: {
  initial?: Partial<ExploreQuery>;
  /** `explore` keeps the panel open at every width and uses the light styling. */
  variant?: 'home' | 'explore';
}) {
  const hasDetail = Boolean(initial?.from || initial?.to || initial?.neighborhood || initial?.interest);
  const [open, setOpen] = useState(variant === 'explore' || hasDetail);
  const panelId = useId();
  const router = useRouter();
  const dark = variant === 'home';

  const label = `mb-1 block text-2xs font-semibold uppercase tracking-[0.14em] ${dark ? 'text-ink-soft md:sr-only' : 'text-ink-soft'}`;
  const field = dark
    ? 'field-input md:h-12 md:border-paper/45 md:bg-transparent md:text-paper md:placeholder:text-paper/60 md:focus:border-paper md:[color-scheme:dark]'
    : 'field-input';
  const withIcon = 'md:pl-10';
  const iconClass = `pointer-events-none absolute left-3 top-1/2 hidden -translate-y-1/2 md:block ${dark ? 'text-paper/70' : 'text-ink-soft'}`;
  const quick = dark
    ? 'inline-flex min-h-11 items-center text-[15px] font-semibold text-ink underline-offset-[0.2em] md:min-h-8 md:text-sm md:text-paper'
    : 'inline-flex min-h-11 items-center text-[15px] font-semibold text-ink underline-offset-[0.2em]';

  // Progressive enhancement: with JS, drop empty fields so the URL only
  // carries real filters. Without JS the native GET submit still works.
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    for (const [key, value] of data.entries()) {
      if (typeof value === 'string' && value.trim()) params.set(key, value.trim());
    }
    // Explicit dates replace a Tonight / This weekend shortcut.
    if (params.has('from') || params.has('to')) params.delete('when');
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
      {initial?.when ? <input type="hidden" name="when" value={initial.when} /> : null}

      <div className="lg:grid lg:grid-cols-[1.1fr_1fr_1fr_1.25fr_auto] lg:items-end lg:gap-3">
        <div>
          <label htmlFor="explore-q" className={`${label} sr-only`}>
            Search shows, places, neighborhoods
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className={iconClass} aria-hidden="true">
                <SearchIcon />
              </span>
              <input
                id="explore-q"
                name="q"
                type="search"
                defaultValue={initial?.q ?? ''}
                placeholder="Shows, places, neighborhoods"
                autoComplete="off"
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
            <span className={`${iconClass} md:top-[calc(50%+0.25rem)] lg:top-1/2`} aria-hidden="true">
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
            <span className={`${iconClass} md:top-[calc(50%+0.25rem)] lg:top-1/2`} aria-hidden="true">
              <NoteIcon />
            </span>
            <select id="explore-interest" name="interest" defaultValue={initial?.interest ?? ''} className={`${field} ${withIcon}`}>
              <option value="">Music, food, art, neighborhoods…</option>
              {INTERESTS.map((i) => (
                <option key={i.value} value={i.value}>
                  {i.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:col-span-2 lg:col-span-1">
            <div className="relative">
              <label htmlFor="explore-from" className={label}>
                From
              </label>
              <span className={`${iconClass} md:top-[calc(50%+0.25rem)] lg:top-1/2`} aria-hidden="true">
                <CalendarIcon />
              </span>
              <input id="explore-from" name="from" type="date" aria-label="From date" defaultValue={initial?.from ?? ''} className={`${field} ${withIcon}`} />
            </div>
            <div>
              <label htmlFor="explore-to" className={label}>
                To
              </label>
              <input id="explore-to" name="to" type="date" aria-label="To date" defaultValue={initial?.to ?? ''} className={field} />
            </div>
          </div>
          <div className="sm:col-span-2 lg:col-span-1">
            <button type="submit" className={dark ? 'btn-reverse hidden w-full md:inline-flex md:w-auto' : 'btn-primary w-full lg:w-auto'}>
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

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 lg:mt-2">
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
            Choose dates
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
