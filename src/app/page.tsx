import Link from 'next/link';
import BookingWidget from '@/components/BookingWidget';
import { HeroMedia, SmartImage } from '@/components/Media';
import { SectionHeader } from '@/components/Ui';
import { EventCard, GuideCard } from '@/components/Cards';
import NeighborhoodMap from '@/components/NeighborhoodMap';
import NewsletterForm from '@/components/NewsletterForm';
import { guides, upcomingEvents } from '@/lib/content';
import { site } from '@/lib/site';
import type { ImageKey } from '@/lib/media';

/** Intent hubs that cover most arriving traffic. */
const INTENT_HUBS: {
  title: string;
  blurb: string;
  href: string;
  image: ImageKey;
}[] = [
  {
    title: 'Hotels',
    blurb: 'Compare neighborhoods on walkability, noise, and rate, then book.',
    href: '/where-to-stay/',
    image: 'hub/hotels',
  },
  {
    title: 'Restaurants',
    blurb: 'Where to eat tonight — by neighborhood, price, and reservation difficulty.',
    href: '/restaurants/',
    image: 'hub/restaurants',
  },
  {
    title: 'Live Music',
    blurb: 'Shows tonight and this weekend, by venue, genre, and price.',
    href: '/live-music-tonight/',
    image: 'hub/live-music',
  },
  {
    title: 'Things to Do',
    blurb: 'Tours, attractions, and party buses worth the time.',
    href: '/things-to-do/',
    image: 'hub/tours',
  },
  {
    title: 'Events',
    blurb: 'What is happening this week, and what to book early.',
    href: '/events/',
    image: 'hub/honky-tonk-highway',
  },
  {
    title: 'Trip Planner',
    blurb: 'Answer a few questions, get a day-by-day plan you can book.',
    href: '/plan/',
    image: 'hub/weekend',
  },
];

const TRIP_TYPES = [
  ['Bachelorette', '/plan/?type=bachelorette'],
  ['Bachelor party', '/plan/?type=bachelor'],
  ['Couples', '/plan/?type=couples'],
  ['Family', '/plan/?type=family'],
  ['First visit', '/plan/?type=first-visit'],
  ['Business', '/plan/?type=business'],
] as const;

const TRENDING_NOW: {
  title: string;
  href: string;
  image: ImageKey;
}[] = [
  {
    title: "Who's Playing in Nashville Tonight",
    href: '/live-music-tonight/',
    image: 'hub/live-music',
  },
  {
    title: 'The Nashville Weekender: Friday to Sunday',
    href: '/weekend/',
    image: 'neighborhood/downtown-broadway',
  },
];

export default function HomePage() {
  const soon = upcomingEvents(4);
  const startHere = [
    'nashville-first-time-visitors',
    'where-to-stay-nashville',
    'nashville-weekend-itinerary',
  ]
    .map((slug) => guides.find((guide) => guide.slug === slug))
    .filter((guide): guide is NonNullable<typeof guide> => Boolean(guide));

  return (
    <>
      <HeroMedia>
        <div className="shell animate-hero-in text-center">
          <h1 className="mx-auto max-w-3xl font-display text-3xl font-bold tracking-tight text-paper-card sm:text-4xl lg:text-5xl">
            {site.headline}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-paper-card/90 sm:text-lg">
            {site.description}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/plan/" className="btn-primary px-5">
              Plan Your Trip
            </Link>
            <Link
              href="#explore"
              className="btn border-paper-card/50 bg-paper-card/10 px-5 text-paper-card backdrop-blur-sm hover:bg-paper-card/20"
            >
              Explore Nashville
            </Link>
          </div>
        </div>
      </HeroMedia>

      <div className="shell relative z-10 -mt-8 sm:-mt-10">
        <div className="mx-auto max-w-4xl animate-hero-in [animation-delay:60ms]">
          <BookingWidget />
        </div>
      </div>

      <section id="explore" className="shell scroll-mt-24 pb-14 pt-12 lg:pb-16 lg:pt-14">
        <SectionHeader title="What are you here to do?" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {INTENT_HUBS.map((hub) => (
            <Link
              key={hub.href}
              href={hub.href}
              className="group relative overflow-hidden rounded-card border border-paper-edge bg-paper-card transition-colors hover:border-ink/20 focus-visible:outline-2"
            >
              <SmartImage imageKey={hub.image} ratio="aspect-[16/10]" />
              <div className="p-4">
                <h3 className="text-lg font-bold leading-snug text-ink group-hover:text-clay">
                  {hub.title}
                </h3>
                <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">{hub.blurb}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-paper-edge bg-paper-card py-14 lg:py-16">
        <div className="shell">
          <SectionHeader
            eyebrow="Start here"
            title="Plan the shape of your trip"
            description="Answer the big questions first: where to stay, what fits into a weekend, and what a first visit actually needs."
            href="/guides/"
            linkLabel="All guides"
          />
          <div className="grid gap-4 lg:grid-cols-3">
            {startHere.map((guide) => (
              <GuideCard key={guide.slug} item={guide} />
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden bg-paper-card py-14 lg:py-20">
        <div className="shell">
          <div className="relative isolate mx-auto max-w-6xl px-3 py-10 sm:px-8 sm:py-12 lg:px-12">
            <div
              className="absolute inset-y-0 left-[10%] right-[10%] -z-30 bg-sky/45"
              aria-hidden="true"
            />
            <div
              className="absolute -inset-y-5 left-[5%] right-[5%] -z-20 bg-sky/30"
              aria-hidden="true"
            />
            <div
              className="absolute inset-y-5 left-0 right-0 -z-10 border border-paper-card/70 bg-sky/75"
              aria-hidden="true"
            />

            <div className="text-center">
              <p className="eyebrow text-clay">What people are planning</p>
              <h2 className="mt-2 font-display text-3xl font-semibold text-ink sm:text-4xl">
                Trending now
              </h2>
              <div className="mx-auto mt-4 flex w-28 items-center justify-center gap-1" aria-hidden="true">
                <span className="h-px flex-1 bg-ink/65" />
                <span className="h-1.5 w-1.5 rotate-45 border border-ink/65" />
                <span className="h-px flex-1 bg-ink/65" />
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {TRENDING_NOW.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group relative min-h-64 overflow-hidden rounded-card border border-paper-card/70 bg-navy shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay sm:min-h-72"
                >
                  <SmartImage
                    imageKey={item.image}
                    ratio="absolute inset-0"
                    className="transition-transform duration-500 group-hover:scale-[1.03]"
                    sizes="(max-width: 767px) 100vw, 50vw"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/20 to-transparent"
                    aria-hidden="true"
                  />
                  <div className="absolute inset-x-0 bottom-0 p-6 text-center sm:p-8">
                    <h3 className="mx-auto max-w-md text-xl font-bold leading-tight text-paper-card sm:text-2xl">
                      {item.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-sky py-12">
        <div className="shell">
          <h2 className="text-center font-display text-xl text-ink">Planning a group trip?</h2>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {TRIP_TYPES.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="rounded border border-ink/15 bg-paper-card px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-clay hover:text-clay"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-paper-card py-14 lg:py-16">
        <div className="shell">
          <SectionHeader title="This Weekend" href="/events/" linkLabel="All events" />
          <div className="grid gap-3 lg:grid-cols-2">
            {soon.map((e) => (
              <EventCard key={e.slug} item={e} compact />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-dogwood/35 py-14 lg:py-16">
        <div className="shell">
          <SectionHeader
            title="Pick your neighborhood"
            description="Where you sleep decides how much of the trip you spend in a car."
            href="/neighborhoods/"
            linkLabel="Compare all areas"
          />
          <NeighborhoodMap />
        </div>
      </section>

      <section className="bg-cumberland py-14 lg:py-16 text-paper-card">
        <div className="shell">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl text-paper-card">How we choose</h2>
            <p className="mt-3 text-[16px] leading-relaxed text-paper-card/85">
              Recommendations come from local knowledge, editorial research, and continued review.
              Sponsored placements are labeled and never decide the ranking.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link
                href="/how-we-choose/"
                className="btn border-paper-card/40 bg-transparent text-paper-card hover:bg-paper-card/10"
              >
                Our methodology
              </Link>
              <Link
                href="/editorial-standards/"
                className="btn border-paper-card/40 bg-transparent text-paper-card hover:bg-paper-card/10"
              >
                Editorial standards
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-mint/25 pb-16 pt-14">
        <div className="shell">
          <div className="mx-auto max-w-xl text-center">
            <p className="eyebrow mb-2 text-ink">{site.newsletter.name}</p>
            <h2 className="text-2xl">{site.newsletter.promise}</h2>
            <div className="mt-5 text-left">
              <NewsletterForm location="homepage" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
