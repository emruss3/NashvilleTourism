'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import LiveEventCard from '@/components/LiveEventCard';
import { SectionHeader } from '@/components/Ui';
import type { LiveEvent } from '@/lib/feeds/ticketmaster';

function categoryOf(event: LiveEvent): string {
  return event.segment || event.genre || 'Other';
}

export default function EventsClient({ events }: { events: LiveEvent[] }) {
  const searchParams = useSearchParams();
  const categories = useMemo(
    () => Array.from(new Set(events.map(categoryOf))).sort(),
    [events],
  );
  const requested = searchParams.get('category');
  const requestedCategory = requested && categories.includes(requested) ? requested : 'all';
  const [active, setActive] = useState<string>(requestedCategory);

  useEffect(() => {
    setActive(requestedCategory);
  }, [requestedCategory]);

  const filtered = active === 'all' ? events : events.filter((event) => categoryOf(event) === active);

  return (
    <>
      <div className="flex flex-wrap gap-2 py-6">
        <Link href="/events/this-weekend/" className="btn-primary">
          This weekend
        </Link>
        <Link
          href="/events/#upcoming"
          onClick={() => setActive('all')}
          className={`rounded border px-4 py-1.5 text-sm font-medium transition-colors ${
            active === 'all'
              ? 'border-ink bg-ink text-paper-card'
              : 'border-paper-edge bg-paper-card text-ink-soft hover:border-ink/30 hover:text-ink'
          }`}
        >
          All events
        </Link>
        {categories.map((category) => (
          <Link
            key={category}
            href={`/events/?category=${encodeURIComponent(category)}#upcoming`}
            onClick={() => setActive(category)}
            className={`rounded border px-4 py-1.5 text-sm font-medium transition-colors ${
              active === category
                ? 'border-ink bg-ink text-paper-card'
                : 'border-paper-edge bg-paper-card text-ink-soft hover:border-ink/30 hover:text-ink'
            }`}
          >
            {category}
          </Link>
        ))}
        <Link
          href="/live-music-tonight/"
          className="rounded border border-paper-edge bg-paper-card px-4 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:border-ink/30 hover:text-ink"
        >
          Live music tonight
        </Link>
        <Link
          href="/plan/"
          className="rounded border border-paper-edge bg-paper-card px-4 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:border-ink/30 hover:text-ink"
        >
          Trip planner
        </Link>
      </div>

      <section id="upcoming" className="scroll-mt-24 py-4">
        <SectionHeader
          title="Upcoming in Nashville"
          description={`${filtered.length} event${filtered.length === 1 ? '' : 's'}${
            active === 'all' ? '' : ` · ${active}`
          }`}
        />
        {filtered.length === 0 ? (
          <p className="rounded-card border border-dashed border-paper-edge bg-paper-card px-6 py-10 text-center text-[15px] text-ink-soft">
            No Nashville events in this category are currently available from the feed.
          </p>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {filtered.map((event) => (
              <LiveEventCard key={`${event.source}-${event.id}`} item={event} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
