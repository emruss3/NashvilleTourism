import Link from 'next/link';
import { SmartImage } from '@/components/Media';

/**
 * Tours and hotels (HOMEPAGE.md §7): two editorial photo links with a
 * concise purpose and an explicit action. Stacked on phones, side by side
 * from tablet up. The photographs are owner-approved concept illustrations.
 */
const TILES = [
  {
    title: 'Tours',
    line: 'Iconic spots. Local stories.',
    cta: 'Explore tours',
    href: '/tours/',
    image: 'concept/backstage-tour' as const,
  },
  {
    title: 'Hotels',
    line: 'Stay close to what moves you.',
    cta: 'Explore hotels',
    href: '/hotels/',
    image: 'concept/hotel-room-corner' as const,
  },
];

export default function ToursHotels({ className = '' }: { className?: string }) {
  return (
    <section className={`section ${className}`} aria-label="Tours and hotels">
      <ul className="shell grid gap-4 md:grid-cols-2 md:gap-6">
        {TILES.map((tile) => (
          <li key={tile.href}>
            <Link href={tile.href} className="group relative block overflow-hidden rounded-card bg-ink text-paper">
              <SmartImage imageKey={tile.image} ratio="aspect-[16/9] md:aspect-[21/9]" sizes="(max-width: 767px) 100vw, 50vw" />
              <span className="absolute inset-0 bg-gradient-to-r from-ink/85 via-ink/40 to-ink/10" aria-hidden="true" />
              <span className="absolute inset-y-0 left-0 flex max-w-[60%] flex-col justify-center p-5 sm:p-7">
                <span className="font-display text-[1.75rem] font-extrabold leading-tight tracking-[-0.03em] sm:text-[2rem]">{tile.title}</span>
                <span className="mt-1 text-2xs font-semibold uppercase tracking-[0.14em] text-paper/85">{tile.line}</span>
                <span className="mt-3 text-[15px] font-semibold underline-offset-[0.2em] group-hover:underline">
                  {tile.cta} <span aria-hidden="true">→</span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
