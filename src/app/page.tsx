import Link from 'next/link';
import BookingWidget from '@/components/BookingWidget';
import { HeroMedia, SmartImage } from '@/components/Media';
import { SectionHeader } from '@/components/Ui';
import { EventCard, NeighborhoodCard } from '@/components/Cards';
import NewsletterForm from '@/components/NewsletterForm';
import { neighborhoods, upcomingEvents } from '@/lib/content';
import type { ImageKey } from '@/lib/media';

/** The six intents that cover most arriving traffic. */
const INTENT_HUBS: {
  title: string;
  blurb: string;
  href: string;
  image: ImageKey;
}[] = [
  {
    title: 'Where to Stay',
    blurb: 'Compare neighborhoods on walkability, noise, and rate, then book.',
    href: '/where-to-stay/',
    image: 'hub/hotels',
  },
  {
    title: 'Live Music Tonight',
    blurb: 'Every show in town, sortable by date, venue, genre, and price.',
    href: '/live-music-tonight/',
    image: 'hub/live-music',
  },
  {
    title: 'Party Buses & Tours',
    blurb: 'Pedal taverns, honky-tonk crawls, and whiskey tastings.',
    href: '/tours/',
    image: 'hub/tours',
  },
  {
    title: 'Honky Tonk Highway',
    blurb: 'How Lower Broadway actually works, and when to go.',
    href: '/honky-tonk-highway/',
    image: 'hub/honky-tonk-highway',
  },
  {
    title: 'The Ultimate Weekend',
    blurb: 'Friday to Sunday, planned and bookable.',
    href: '/weekend/',
    image: 'hub/weekend',
  },
  {
    title: 'Build Your Own Trip',
    blurb: 'Answer six questions, get a day-by-day plan.',
    href: '/plan/',
    image: 'hub/bachelorette',
  },
];

/** Group-trip routing, which is where the money is. */
const TRIP_TYPES = [
  ['Bachelorette', '/plan/?type=bachelorette'],
  ['Bachelor party', '/plan/?type=bachelor'],
  ['Couples', '/plan/?type=couples'],
  ['Family', '/plan/?type=family'],
  ['First visit', '/plan/?type=first-visit'],
  ['Business', '/plan/?type=business'],
] as const;

export default function HomePage() {
  const soon = upcomingEvents(4);
  const featuredHoods = neighborhoods.slice(0, 6);

  return (
    <>
      {/* Hero: one line, one widget. Nothing else above the fold. */}
      <HeroMedia>
        {/* Bottom padding leaves room for the widget to overlap from outside. */}
        <div className="shell pb-28 pt-12 text-center sm:pb-32 sm:pt-20 lg:pt-24">
          <h1 className="mx-auto max-w-3xl text-4xl text-white drop-shadow-sm sm:text-5xl lg:text-6xl">
            Your Official Guide to Music City
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-lg text-white/85">
            Book hotels, tours, and tickets in one place.
          </p>
        </div>
      </HeroMedia>

      {/* The widget lives OUTSIDE HeroMedia and is pulled up over it. Placing it
          inside would let HeroMedia's overflow-hidden, which exists to clip the
          background video, cut off the form body. */}
      <div className="shell relative z-10 -mt-24 sm:-mt-28">
        <div className="mx-auto max-w-4xl">
          <BookingWidget />
        </div>
      </div>

      {/* Decision matrix: pick your intent. */}
      <section className="shell py-10 lg:py-14">
        <SectionHeader
          eyebrow="Start here"
          title="What are you here to do?"
          description="Six routes that cover most trips. Each one ends in something you can book."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {INTENT_HUBS.map((hub) => (
            <Link
              key={hub.href}
              href={hub.href}
              className="card group relative overflow-hidden focus-visible:outline-2"
            >
              <SmartImage imageKey={hub.image} ratio="aspect-[16/10]" />
              <div className="p-4">
                <h3 className="font-display text-lg leading-snug text-ink group-hover:text-clay">
                  {hub.title}
                </h3>
                <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">{hub.blurb}</p>
                <span className="mt-2 inline-block text-sm font-semibold text-clay">
                  Explore →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Trip-type router */}
      <section className="border-y border-paper-edge bg-paper-sunk py-10">
        <div className="shell">
          <h2 className="text-center font-display text-xl text-ink">Planning a group trip?</h2>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {TRIP_TYPES.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="rounded-full border border-paper-edge bg-white px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-clay hover:text-clay"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* What's on */}
      <section className="shell py-10 lg:py-14">
        <SectionHeader
          eyebrow="What's on"
          title="Coming up in Nashville"
          href="/live-music-tonight/"
          linkLabel="Full show calendar"
        />
        <div className="grid gap-4 lg:grid-cols-2">
          {soon.map((e) => (
            <EventCard key={e.slug} item={e} />
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/live-music-tonight/" className="btn-primary">
            See who&rsquo;s playing tonight
          </Link>
          <Link href="/events/this-weekend/" className="btn-secondary">
            This weekend
          </Link>
        </div>
      </section>

      {/* Neighborhoods */}
      <section className="border-y border-paper-edge bg-paper-sunk py-10 lg:py-14">
        <div className="shell">
          <SectionHeader
            eyebrow="Get oriented"
            title="Pick your neighborhood"
            description="Nashville is a driving city. Where you sleep decides how much of the trip you spend in a car."
            href="/neighborhoods/"
            linkLabel="Compare all areas"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredHoods.map((n) => (
              <NeighborhoodCard key={n.slug} item={n} />
            ))}
          </div>
        </div>
      </section>

      {/* Trust, kept short */}
      <section className="shell py-10 lg:py-14">
        <div className="grid gap-8 rounded-card border border-paper-edge bg-white p-6 lg:grid-cols-[1fr_1.4fr] lg:p-8">
          <div>
            <p className="eyebrow mb-2">Why trust this site</p>
            <h2 className="text-2xl">How we choose</h2>
          </div>
          <div>
            <p className="max-w-prose text-[16px] leading-relaxed text-ink-soft">
              Our recommendations are based on local knowledge, editorial research, firsthand
              experience, reader feedback, and continued review. Sponsored placements are clearly
              identified and do not determine editorial rankings.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/how-we-choose/" className="btn-secondary">
                Our methodology
              </Link>
              <Link href="/editorial-standards/" className="btn-secondary">
                Editorial standards
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="shell pb-14">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl">Nashville plans, once a week.</h2>
          <p className="mt-2 text-[16px] leading-relaxed text-ink-soft">
            New openings, weekend events, and what is worth booking early.
          </p>
          <div className="mt-5 text-left">
            <NewsletterForm location="homepage" />
          </div>
        </div>
      </section>
    </>
  );
}
