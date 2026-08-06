import Link from 'next/link';
import NeighborhoodMap from '@/components/NeighborhoodMap';
import { neighborhoods } from '@/lib/content';

function broadwayLabel(n: (typeof neighborhoods)[number]) {
  const { walk, drive } = n.broadwayMinutes;
  if (typeof walk === 'number' && walk === 0) return 'On Broadway';
  if (typeof walk === 'number') return `${walk} min walk`;
  if (typeof drive === 'number') return `${drive} min drive`;
  return '—';
}

/** Featured decision snapshot — surrounding presentation only; map unchanged. */
const SNAPSHOT_SLUGS = ['downtown-broadway', 'the-gulch', 'east-nashville', 'germantown'] as const;

export default function NeighborhoodSectionV2() {
  const snapshots = SNAPSHOT_SLUGS.map((slug) => neighborhoods.find((n) => n.slug === slug)).filter(
    (n): n is NonNullable<typeof n> => Boolean(n),
  );

  return (
    <section className="bg-cumberland py-14 text-paper-card lg:py-16">
      <div className="shell">
        <div className="max-w-2xl">
          <h2 className="font-sans text-2xl font-bold tracking-tight text-paper-card sm:text-3xl">
            Pick your neighborhood
          </h2>
          <p className="mt-2 text-body text-paper-card/85">
            Where you sleep decides how much of the trip you spend in a car.
          </p>
        </div>

        <div className="mt-8">
          <NeighborhoodMap />
        </div>

        <div className="mt-8 grid gap-6 border-t border-paper-card/15 pt-8 sm:grid-cols-2 lg:grid-cols-4">
          {snapshots.map((hood) => (
            <div key={hood.slug} className="min-w-0">
              <h3 className="font-sans text-base font-bold text-paper-card">{hood.name}</h3>
              <dl className="mt-3 space-y-2 text-sm">
                <div>
                  <dt className="text-2xs font-bold uppercase tracking-wider text-paper-card/55">
                    Best for
                  </dt>
                  <dd className="mt-0.5 text-paper-card/90">{hood.bestFor.slice(0, 2).join(', ')}</dd>
                </div>
                <div>
                  <dt className="text-2xs font-bold uppercase tracking-wider text-paper-card/55">
                    Walkability
                  </dt>
                  <dd className="mt-0.5 line-clamp-2 text-paper-card/90">{hood.walkability}</dd>
                </div>
                <div>
                  <dt className="text-2xs font-bold uppercase tracking-wider text-paper-card/55">
                    Noise
                  </dt>
                  <dd className="mt-0.5 line-clamp-2 text-paper-card/90">{hood.noiseLevel}</dd>
                </div>
                <div>
                  <dt className="text-2xs font-bold uppercase tracking-wider text-paper-card/55">
                    Time to Broadway
                  </dt>
                  <dd className="mt-0.5 text-paper-card/90">{broadwayLabel(hood)}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <Link
            href="/neighborhoods/"
            className="btn border-paper-card/40 bg-transparent text-paper-card hover:bg-paper-card/10"
          >
            Explore all neighborhoods
          </Link>
        </div>
      </div>
    </section>
  );
}
