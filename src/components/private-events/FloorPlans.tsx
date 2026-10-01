import type { EventMedia } from '@/lib/events/types';

/**
 * Floor plans the venue uploaded (event_media.kind = floor_plan), one per
 * floor, labelled by the venue. Images open full size in a new tab; PDFs
 * link out.
 */
export default function FloorPlans({ plans, name }: { plans: EventMedia[]; name: string }) {
  if (!plans.length) return null;
  return (
    <ul className="grid gap-4 sm:grid-cols-2" aria-label={`${name} floor plans`}>
      {plans.map((m) => {
        const pdf = /\.pdf($|\?)/i.test(m.url);
        return (
          <li key={m.id}>
            <figure className="rounded-card border border-paper-edge bg-paper p-3">
              <a href={m.url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded bg-white">
                {pdf ? (
                  <span className="flex aspect-[4/3] items-center justify-center text-sm font-semibold text-ink">Open the PDF plan</span>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt={m.alt || `${m.floorLabel ?? 'Floor plan'} of ${name}`} loading="lazy" className="aspect-[4/3] w-full object-contain" />
                )}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
              <figcaption className="mt-2 flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="font-sans font-bold text-ink">{m.floorLabel ?? 'Floor plan'}</span>
                {m.credit ? <span className="text-2xs text-ink-soft">{m.credit}</span> : null}
              </figcaption>
            </figure>
          </li>
        );
      })}
    </ul>
  );
}
