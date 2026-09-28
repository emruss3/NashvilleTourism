'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { ANALYTICS_EVENTS, track } from '@/lib/analytics';
import { SHORTLIST_MAX, parseShortlist, withShortlist } from '@/lib/private-events';

/**
 * The shortlist lives in the URL (`?v=slug,slug`) and nowhere else, so it
 * survives refresh, can be shared, and never needs storage. The bar sits
 * above the phone bottom navigation and disappears when the list is empty.
 */
function useShortlist() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const slugs = parseShortlist(params.get('v'));
  function set(next: string[]) {
    const sp = new URLSearchParams(params.toString());
    if (next.length) sp.set('v', next.join(','));
    else sp.delete('v');
    const qs = sp.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
  }
  return { slugs, set };
}

function Button({ slug, name, compact = false }: { slug: string; name: string; compact?: boolean }) {
  const { slugs, set } = useShortlist();
  const on = slugs.includes(slug);
  const full = !on && slugs.length >= SHORTLIST_MAX;
  const label = on ? 'Remove from shortlist' : full ? `Shortlist is full (${SHORTLIST_MAX})` : 'Add to shortlist';
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={full}
      onClick={() => {
        if (on) {
          set(slugs.filter((s) => s !== slug));
          return;
        }
        set([...slugs, slug]);
        track(ANALYTICS_EVENTS.EVENTS_SHORTLIST_ADDED, { item_id: slug, item_name: name, item_type: 'event_venue', venue_count: slugs.length + 1 });
      }}
      className={
        compact
          ? `inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold underline-offset-[0.2em] hover:underline disabled:text-ink-soft disabled:no-underline ${on ? 'text-ink underline' : 'text-ink'}`
          : `btn-secondary ${on ? 'bg-paper-sunk' : ''}`
      }
    >
      <span aria-hidden="true">{on ? '✓' : '+'}</span>
      {label}
    </button>
  );
}

export function ShortlistButton(props: { slug: string; name: string; compact?: boolean }) {
  return (
    <Suspense fallback={null}>
      <Button {...props} />
    </Suspense>
  );
}

function Bar({ venues }: { venues: { slug: string; name: string }[] }) {
  const { slugs, set } = useShortlist();
  if (!slugs.length) return null;
  const named = slugs.map((slug) => ({ slug, name: venues.find((v) => v.slug === slug)?.name ?? slug }));
  return (
    <div role="region" aria-label="Your shortlist" className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-30 md:bottom-4">
      <div className="shell">
        <div className="flex flex-wrap items-center gap-2 rounded-card border-2 border-ink bg-paper p-3">
          <span className="text-2xs font-bold uppercase tracking-[0.14em] text-ink">
            Shortlist {slugs.length}/{SHORTLIST_MAX}
          </span>
          <ul className="flex flex-wrap items-center gap-1.5">
            {named.map((v) => (
              <li key={v.slug} className="inline-flex items-center gap-1 rounded border border-paper-edge bg-paper-sunk pl-2 text-sm text-ink">
                {v.name}
                <button type="button" onClick={() => set(slugs.filter((s) => s !== v.slug))} className="inline-flex h-8 w-8 items-center justify-center text-ink-soft hover:text-ink" aria-label={`Remove ${v.name} from shortlist`}>
                  <span aria-hidden="true">×</span>
                </button>
              </li>
            ))}
          </ul>
          <Link href={withShortlist('/private-events/#inquiry', slugs)} className="btn-primary min-h-11 py-2 sm:ml-auto">
            Send a brief to {slugs.length === 1 ? 'this venue' : `these ${slugs.length}`}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ShortlistBar(props: { venues: { slug: string; name: string }[] }) {
  return (
    <Suspense fallback={null}>
      <Bar {...props} />
    </Suspense>
  );
}
