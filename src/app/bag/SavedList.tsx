'use client';

import Link from 'next/link';
import { useSaved } from '@/components/useSaved';
import { SAVED_KIND_LABELS, removeSaved } from '@/lib/saved';

/** The browser-local trip draft, with remove controls and a hand-off to the planner. */
export default function SavedList() {
  const { items, ready } = useSaved();

  if (!ready) return <p className="text-[15px] text-ink-soft">Loading your saved places…</p>;

  if (items.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-paper-edge p-6">
        <p className="text-[17px] font-semibold">Nothing saved yet.</p>
        <p className="mt-1 text-[15px] text-ink-soft">Use Save on any restaurant, venue, hotel or thing to do and it will appear here.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/restaurants/" className="btn-secondary">
            Restaurants
          </Link>
          <Link href="/things-to-do/" className="btn-secondary">
            Things to do
          </Link>
          <Link href="/music/" className="btn-secondary">
            Music
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <ul className="divide-y divide-paper-edge border-y border-paper-edge">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
              <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
                {SAVED_KIND_LABELS[item.kind]}
                {item.meta ? ` · ${item.meta}` : ''}
              </p>
              {/^https?:\/\//.test(item.href) ? (
                <a href={item.href} target="_blank" rel="noopener noreferrer" className="font-sans text-[17px] font-bold text-ink underline-offset-[0.2em] hover:underline">
                  {item.title}
                </a>
              ) : (
                <Link href={item.href} className="font-sans text-[17px] font-bold text-ink underline-offset-[0.2em] hover:underline">
                  {item.title}
                </Link>
              )}
            </div>
            <button type="button" onClick={() => removeSaved(item.id)} className="inline-flex min-h-11 shrink-0 items-center px-2 text-sm font-semibold text-ink-soft underline-offset-[0.2em] hover:underline">
              Remove
              <span className="sr-only"> {item.title}</span>
            </button>
          </li>
        ))}
      </ul>
      <Link href="/plan/" className="btn-primary mt-5">
        Build a trip around these
        <span aria-hidden="true">→</span>
      </Link>
    </>
  );
}
