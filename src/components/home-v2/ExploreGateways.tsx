import Link from 'next/link';
import { SmartImage } from '@/components/Media';
import type { ImageKey } from '@/lib/media';

const GATEWAYS: {
  title: string;
  line: string;
  href: string;
  image: ImageKey;
  dominant?: boolean;
}[] = [
  {
    title: 'Music & Nightlife',
    line: 'Shows, honky-tonks, and rooms worth the cover.',
    href: '/live-music-tonight/',
    image: 'hub/live-music',
    dominant: true,
  },
  {
    title: 'Eat & Drink',
    line: 'Where to eat tonight — by neighborhood and price.',
    href: '/restaurants/',
    image: 'hub/restaurants',
  },
  {
    title: 'Where to Stay',
    line: 'Hotels and neighborhoods matched to your trip.',
    href: '/where-to-stay/',
    image: 'hub/hotels',
  },
];

const QUICK_LINKS = [
  { label: 'Events', href: '/events/' },
  { label: 'Tours', href: '/tours/' },
  { label: 'Neighborhoods', href: '/neighborhoods/' },
  { label: 'First Visit', href: '/guides/nashville-first-time-visitors/' },
  { label: 'Group Trips', href: '/plan/?type=bachelorette' },
] as const;

export default function ExploreGateways() {
  const [music, eat, stay] = GATEWAYS;

  return (
    <section id="explore" className="shell scroll-mt-24 pb-14 pt-10 lg:pb-16 lg:pt-12">
      <h2 className="font-sans text-2xl font-bold tracking-tight text-ink sm:text-3xl">
        Explore Nashville
      </h2>

      <div className="mt-6 grid gap-3 lg:grid-cols-2 lg:grid-rows-2 lg:gap-4 lg:auto-rows-fr">
        <GatewayTile
          item={music}
          className="lg:row-span-2"
          ratio="aspect-[4/3] lg:aspect-auto lg:absolute lg:inset-0"
          wrapClassName="relative lg:min-h-[28rem]"
        />
        <GatewayTile item={eat} ratio="aspect-[16/10]" />
        <GatewayTile item={stay} ratio="aspect-[16/10]" />
      </div>

      <nav
        aria-label="More ways to explore"
        className="mt-8 flex flex-wrap items-center gap-x-1 gap-y-2 border-t border-paper-edge pt-5 text-sm font-semibold text-ink"
      >
        {QUICK_LINKS.map((link, i) => (
          <span key={link.href} className="inline-flex items-center">
            {i > 0 && (
              <span className="mx-3 text-ink-faint/40" aria-hidden="true">
                ·
              </span>
            )}
            <Link href={link.href} className="transition-colors hover:text-clay">
              {link.label}
            </Link>
          </span>
        ))}
      </nav>
    </section>
  );
}

function GatewayTile({
  item,
  className = '',
  wrapClassName = '',
  ratio,
}: {
  item: (typeof GATEWAYS)[number];
  className?: string;
  wrapClassName?: string;
  ratio: string;
}) {
  return (
    <Link
      href={item.href}
      className={`group relative block overflow-hidden rounded-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay ${wrapClassName} ${className}`}
    >
      <SmartImage
        imageKey={item.image}
        ratio={ratio}
        className="transition-transform duration-500 group-hover:scale-[1.02]"
        sizes="(max-width: 1023px) 100vw, 50vw"
        showCredit={false}
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-navy/80 via-navy/15 to-transparent"
        aria-hidden="true"
      />
      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
        <h3 className="font-sans text-xl font-bold text-paper-card sm:text-2xl">{item.title}</h3>
        <p className="mt-1 max-w-sm text-sm text-paper-card/85">{item.line}</p>
        <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-paper-card">
          Explore
          <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </span>
      </div>
    </Link>
  );
}
