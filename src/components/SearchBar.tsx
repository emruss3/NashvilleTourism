'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { searchDocs } from '@/lib/content';
import { ANALYTICS_EVENTS, track } from '@/lib/analytics';
import type { SearchDoc } from '@/lib/types';

const QUICK_LINKS = [
  { label: 'This Weekend', href: '/events/this-weekend/' },
  { label: 'Best Restaurants', href: '/guides/best-restaurants-nashville/' },
  { label: 'Live Music Tonight', href: '/live-music-tonight/' },
  { label: 'Where to Stay', href: '/where-to-stay/' },
  { label: 'First Visit', href: '/guides/nashville-first-time-visitors/' },
];

/**
 * Type-ahead search over the local index. Implements the combobox pattern:
 * arrow keys move the active option, Enter opens it, Escape closes the list.
 */
export default function SearchBar({
  size = 'large',
  showQuickLinks = true,
  autoFocus = false,
}: {
  size?: 'large' | 'compact';
  showQuickLinks?: boolean;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const results = useMemo(() => (query.trim().length >= 2 ? searchDocs(query).slice(0, 8) : []), [query]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function go(doc: SearchDoc) {
    track(ANALYTICS_EVENTS.SEARCH_RESULT_CLICKED, {
      search_term: query,
      item_id: doc.slug,
      item_type: doc.type,
    });
    setOpen(false);
    router.push(doc.href);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (active >= 0 && results[active]) {
      go(results[active]);
      return;
    }
    track(ANALYTICS_EVENTS.SEARCH_SUBMITTED, { search_term: query, results_count: results.length });
    router.push(`/search/?q=${encodeURIComponent(query)}`);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActive(-1);
    }
  }

  const big = size === 'large';

  return (
    <div ref={wrapRef} className="relative w-full">
      <form onSubmit={onSubmit} role="search">
        <label htmlFor="site-search" className="sr-only">
          Search restaurants, hotels, events, neighborhoods, and guides
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.8" />
                <path d="m13.5 13.5 3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </span>
            <input
              id="site-search"
              type="search"
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus={autoFocus}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
                setActive(-1);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={onKeyDown}
              placeholder="Search restaurants, hotels, events, neighborhoods, and guides"
              className={`field-input pl-10 ${big ? 'py-3.5 text-base' : ''}`}
              role="combobox"
              aria-expanded={open && results.length > 0}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={active >= 0 ? `${listId}-opt-${active}` : undefined}
            />
          </div>
          <button type="submit" className={`btn-primary shrink-0 ${big ? 'px-6' : ''}`}>
            Search
          </button>
        </div>
      </form>

      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-card border border-paper-edge bg-white shadow-lift">
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-ink-soft">
              No matches for “{query}”. Try a neighborhood, a category, or a guide title.
            </p>
          ) : (
            <ul id={listId} role="listbox" aria-label="Search results" className="max-h-96 overflow-y-auto">
              {results.map((doc, i) => (
                <li key={doc.href} id={`${listId}-opt-${i}`} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onClick={() => go(doc)}
                    onMouseEnter={() => setActive(i)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                      i === active ? 'bg-paper-card' : 'hover:bg-paper-card'
                    }`}
                  >
                    <span className="mt-0.5 shrink-0 rounded border border-paper-edge bg-paper px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-wider text-ink-faint">
                      {doc.type}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-ink">{doc.title}</span>
                      <span className="block truncate text-sm text-ink-faint">
                        {doc.neighborhood ? `${doc.neighborhood} · ` : ''}
                        {doc.summary}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {showQuickLinks && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-2xs font-semibold uppercase tracking-wider text-ink-faint">Popular</span>
          {QUICK_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded border border-paper-edge bg-white px-3 py-1 text-sm text-ink-soft transition-colors hover:border-clay hover:text-clay"
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
