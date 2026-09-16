'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ANALYTICS_EVENTS, track } from '@/lib/analytics';
import { INTERESTS, WHEN_OPTIONS, exploreHref, neighborhoodOptions, type ExploreQuery } from '@/lib/explore';

/**
 * Discovery module (MOBILE-FIRST.md §Homepage 3, SITE-LAYOUT.md §Discovery
 * band). Rendered once: a visible search field, the quick date links
 * (Tonight / This weekend), and a "Choose dates" disclosure holding dates,
 * neighborhood and interest. A plain GET form to /explore/, so selections
 * live in the URL and survive Back and reload. Dates default to unset.
 */
export default function DiscoveryForm({
  initial,
  variant = 'home',
}: {
  initial?: Partial<ExploreQuery>;
  /** `explore` opens the disclosure by default and labels the search for results. */
  variant?: 'home' | 'explore';
}) {
  const hasDetail = Boolean(initial?.from || initial?.to || initial?.neighborhood || initial?.interest);
  const label = 'mb-1.5 block text-2xs font-semibold uppercase tracking-[0.14em] text-ink-soft';
  const router = useRouter();

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

  return (
    <form action="/explore/" method="get" onSubmit={onSubmit} role="search" aria-label="Find shows, places and neighborhoods">
      {initial?.when ? <input type="hidden" name="when" value={initial.when} /> : null}
      <label htmlFor="explore-q" className="sr-only">
        Search shows, places, neighborhoods
      </label>
      <div className="flex gap-2">
        <input
          id="explore-q"
          name="q"
          type="search"
          defaultValue={initial?.q ?? ''}
          placeholder="Shows, places, neighborhoods"
          autoComplete="off"
          className="field-input flex-1"
        />
        <button type="submit" className="btn-primary shrink-0 px-4 sm:px-6">
          <span className="sm:hidden" aria-hidden="true">
            →
          </span>
          <span className="sr-only sm:not-sr-only">Find your plans</span>
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        {WHEN_OPTIONS.map((w) => (
          <Link
            key={w.value}
            href={exploreHref({ when: w.value, neighborhood: initial?.neighborhood, interest: initial?.interest, q: initial?.q })}
            className={`inline-flex min-h-11 items-center text-[15px] font-semibold text-ink underline-offset-[0.2em] ${
              initial?.when === w.value ? 'underline' : 'hover:underline'
            }`}
            aria-current={initial?.when === w.value ? 'true' : undefined}
          >
            {w.label}
          </Link>
        ))}
        <details className="group w-full" open={variant === 'explore' || hasDetail}>
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-[15px] font-semibold text-ink underline-offset-[0.2em] hover:underline [&::-webkit-details-marker]:hidden">
            Choose dates
            <span aria-hidden="true" className="text-xs transition-transform group-open:rotate-180">
              ▾
            </span>
          </summary>
          <div className="mt-2 grid gap-3 rounded-card border border-paper-edge bg-paper-sunk p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="explore-from" className={label}>
                From
              </label>
              <input id="explore-from" name="from" type="date" defaultValue={initial?.from ?? ''} className="field-input" />
            </div>
            <div>
              <label htmlFor="explore-to" className={label}>
                To
              </label>
              <input id="explore-to" name="to" type="date" defaultValue={initial?.to ?? ''} className="field-input" />
            </div>
            <div>
              <label htmlFor="explore-neighborhood" className={label}>
                Neighborhood
              </label>
              <select id="explore-neighborhood" name="neighborhood" defaultValue={initial?.neighborhood ?? ''} className="field-input">
                <option value="">All Nashville</option>
                {neighborhoodOptions().map((n) => (
                  <option key={n.value} value={n.value}>
                    {n.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="explore-interest" className={label}>
                Interest
              </label>
              <select id="explore-interest" name="interest" defaultValue={initial?.interest ?? ''} className="field-input">
                <option value="">Anything</option>
                {INTERESTS.map((i) => (
                  <option key={i.value} value={i.value}>
                    {i.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <button type="submit" className="btn-secondary w-full sm:w-auto">
                Apply
              </button>
            </div>
          </div>
        </details>
      </div>
    </form>
  );
}
