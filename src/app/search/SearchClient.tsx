'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import SearchBar from '@/components/SearchBar';
import { EmptyState } from '@/components/Ui';
import { searchDocs } from '@/lib/content';
import { ANALYTICS_EVENTS, track } from '@/lib/analytics';

const TYPES = ['All', 'Guide', 'Restaurant', 'Hotel', 'Event', 'Venue', 'Attraction', 'Neighborhood'] as const;

export default function SearchClient() {
  const params = useSearchParams();
  const q = params.get('q') ?? '';
  const [filter, setFilter] = useState<(typeof TYPES)[number]>('All');

  const all = useMemo(() => (q ? searchDocs(q) : []), [q]);
  const results = useMemo(
    () => (filter === 'All' ? all : all.filter((d) => d.type === filter)),
    [all, filter],
  );

  useEffect(() => {
    if (q) track(ANALYTICS_EVENTS.SEARCH_SUBMITTED, { search_term: q, results_count: all.length });
  }, [q, all.length]);

  return (
    <div>
      <div className="max-w-2xl">
        <SearchBar autoFocus={!q} />
      </div>

      {q && (
        <>
          <p className="mt-6 text-[15px] text-ink-soft">
            {all.length} result{all.length === 1 ? '' : 's'} for <strong className="text-ink">“{q}”</strong>
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {TYPES.map((t) => {
              const count = t === 'All' ? all.length : all.filter((d) => d.type === t).length;
              if (t !== 'All' && count === 0) return null;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFilter(t)}
                  aria-pressed={filter === t}
                  className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                    filter === t
                      ? 'border-clay bg-clay text-white'
                      : 'border-paper-edge bg-white text-ink-soft hover:border-clay'
                  }`}
                >
                  {t} ({count})
                </button>
              );
            })}
          </div>

          <div className="mt-8">
            {results.length === 0 ? (
              <EmptyState
                title="No matches"
                description="Try a neighborhood name, a category like restaurants or hotels, or browse the guides index."
                action={
                  <Link href="/guides/" className="btn-primary">
                    Browse guides
                  </Link>
                }
              />
            ) : (
              <ul className="divide-y divide-paper-edge border-y border-paper-edge">
                {results.map((doc) => (
                  <li key={doc.href}>
                    <Link
                      href={doc.href}
                      onClick={() =>
                        track(ANALYTICS_EVENTS.SEARCH_RESULT_CLICKED, {
                          search_term: q,
                          item_id: doc.slug,
                          item_type: doc.type,
                        })
                      }
                      className="flex flex-col gap-1 py-4 transition-colors hover:bg-paper-sunk"
                    >
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="rounded border border-paper-edge bg-paper-sunk px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-wider text-ink-faint">
                          {doc.type}
                        </span>
                        {doc.neighborhood && (
                          <span className="text-2xs uppercase tracking-wider text-ink-faint">
                            {doc.neighborhood}
                          </span>
                        )}
                      </span>
                      <span className="font-sans text-lg font-bold text-ink">{doc.title}</span>
                      <span className="text-[15px] text-ink-soft">{doc.summary}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {!q && (
        <div className="mt-8">
          <EmptyState
            title="What are you looking for?"
            description="Search by name, neighborhood, or category. Try “East Nashville”, “hotels”, or “weekend”."
          />
        </div>
      )}
    </div>
  );
}
