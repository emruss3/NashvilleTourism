import Link from 'next/link';
import { SmartImage } from '@/components/Media';
import { neighborhoods } from '@/lib/content/neighborhoods';
import { neighborhoodImageKey } from '@/lib/media-placements';

/**
 * "Find your corner." Three compact neighborhood cards in normal vertical
 * flow on phones (no swiping), three equal landscape cards on desktop, and
 * a browse-all link. Each card is one link with a real, cleared photograph;
 * the small-caps line under the name comes from the neighborhood's own
 * known-for list, not concept copy.
 */
const INITIAL_SLUGS = ['east-nashville', 'germantown', 'wedgewood-houston'] as const;

export default function NeighborhoodCards({ className = '' }: { className?: string }) {
  const cards = INITIAL_SLUGS.map((slug) => neighborhoods.find((n) => n.slug === slug)).filter(
    (n): n is NonNullable<typeof n> => Boolean(n),
  );

  return (
    <section className={`section ${className}`} aria-labelledby="neighborhoods-title">
      <div className="shell">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end md:gap-8">
          <div>
            <p className="eyebrow">Neighborhoods</p>
            <h2 id="neighborhoods-title" className="mt-1 text-[2rem] sm:text-[2.5rem]">
              Find your corner.
            </h2>
          </div>
          <p className="max-w-[16rem] text-[15px] leading-snug text-ink-soft md:pb-1">
            Different neighborhoods.
            <br className="hidden md:inline" /> A closer Nashville.
          </p>
          <Link
            href="/neighborhoods/"
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-ink underline-offset-[0.2em] hover:underline md:pb-1"
          >
            Explore all neighborhoods
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        <ul className="mt-5 grid gap-4 md:grid-cols-3 md:gap-5">
          {cards.map((hood) => (
            <li key={hood.slug}>
              <Link
                href={`/neighborhoods/${hood.slug}/`}
                className="group relative block overflow-hidden rounded-card bg-ink text-paper focus-visible:outline-offset-4"
              >
                <SmartImage
                  imageKey={neighborhoodImageKey(hood.slug)}
                  ratio="aspect-[16/9] md:aspect-[16/9]"
                  sizes="(max-width: 767px) 100vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/25 to-transparent" aria-hidden="true" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 sm:p-5">
                  <div className="min-w-0">
                    <h3 className="text-[1.5rem] font-bold leading-tight tracking-[-0.03em] text-paper">{hood.name}</h3>
                    <p className="mt-1 truncate text-2xs font-semibold uppercase tracking-[0.14em] text-paper/85">
                      {hood.knownFor.slice(0, 2).join(' · ')}
                    </p>
                  </div>
                  <span aria-hidden="true" className="shrink-0 text-xl text-paper transition-transform group-hover:translate-x-0.5">
                    →
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
