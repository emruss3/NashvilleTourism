'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { EventCard } from '@/components/Cards';
import { SectionHeader } from '@/components/Ui';
import type { EventCategory, NashvilleEvent } from '@/lib/types';

export default function EventsClient({ events }: { events: NashvilleEvent[] }) {
  const searchParams = useSearchParams();
  const categories = useMemo(
    () => Array.from(new Set(events.map((e) => e.category))).sort(),
    [events],
  );
  const requested = searchParams.get('category') as EventCategory | null;
  const requestedCategory = requested && categories.includes(requested) ? requested : 'all';
  const [active, setActive] = useState<EventCategory | 'all'>(requestedCategory);

  useEffect(() => {
    setActive(requestedCategory);
  }, [requestedCategory]);

  const filtered = active === 'all' ? events : events.filter((e) => e.category === active);

  return (
    <>
      <div className="flex flex-wrap gap-2 py-6">
        <Link href="/events/this-weekend/" className="btn-primary">
          This weekend
        </Link>
        <button
          type="button"
          onClick={() => setActive('all')}
          className={`rounded border px-4 py-1.5 text-sm font-medium transition-colors ${
            active === 'all'
              ? 'border-ink bg-ink text-paper-card'
              : 'border-paper-edge bg-paper-card text-ink-soft hover:border-ink/30 hover:text-ink'
          }`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            type="button"
            key={c}
            onClick={() => setActive(c)}
            className={`rounded border px-4 py-1.5 text-sm font-medium transition-colors ${
              active === c
                ? 'border-ink bg-ink text-paper-card'
                : 'border-paper-edge bg-paper-card text-ink-soft hover:border-ink/30 hover:text-ink'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <section id="upcoming" className="scroll-mt-24 py-4">
        <SectionHeader
          title="Upcoming"
          description={`${filtered.length} event${filtered.length === 1 ? '' : 's'}${
            active === 'all' ? '' : ` · ${active}`
          }`}
        />
        {filtered.length === 0 ? (
          <p className="rounded-card border border-dashed border-paper-edge bg-paper-card px-6 py-10 text-center text-[15px] text-ink-soft">
            No events in this category yet.
          </p>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {filtered.map((e) => (
              <EventCard key={e.slug} item={e} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
