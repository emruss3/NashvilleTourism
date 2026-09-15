import Link from 'next/link';
import BookingWidget from '@/components/BookingWidget';
import { HeroMedia, SmartImage } from '@/components/Media';
import { SectionHeader } from '@/components/Ui';
import { GuideCard } from '@/components/Cards';
import LiveEventCard from '@/components/LiveEventCard';
import NeighborhoodMap from '@/components/NeighborhoodMap';
import NewsletterForm from '@/components/NewsletterForm';
import { TourProductCard } from '@/components/tours/TourProductCard';
import { guides } from '@/lib/content';
import { getCalendar } from '@/lib/feeds/calendar';
import { getToursCatalog } from '@/lib/feeds/tours';
import { experienceToProductSummary } from '@/lib/feeds/experiences';
import { site } from '@/lib/site';
import type { ImageKey } from '@/lib/media';
import { assertHomepageMediaIntegrity } from '@/lib/assert-homepage-media';

assertHomepageMediaIntegrity();

/** Intent hubs that cover most arriving traffic. Order follows booking value. */
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
    title: 'Live Music',
    blurb: 'Shows tonight and this weekend, by venue, genre, and price.',
    href: '/live-music-tonight/',
    image: 'hub/live-music',
  },
  {
    title: 'Restaurants',
    blurb: 'Where to eat tonight, by neighborhood, price, and how hard the table is.',
    href: '/restaurants/',
    image: 'hub/restaurants',
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
    image: 'hub/tickets',
  },
  {
    title: 'Trip Planner',
    blurb: 'Answer a few questions, get a day-by-day plan you can book.',
    href: '/plan/',
    image: 'hub/weekend',
  },
];

const TRIP_TYPES = [
  ['First visit', '/plan/?type=first-visit'],
  ['Bachelorette', '/plan/?type=bachelorette'],
  ['Bachelor party', '/plan/?type=bachelor'],
  ['Couples', '/plan/?type=couples'],
  ['Family', '/plan/?type=family'],
  ['Business', '/plan/?type=business'],
] as const;

/** Guides with cleared cover photography only, so the row never shows a blank slot. */
const START_HERE_SLUGS = [
  'nashville-first-time-visitors',
  'nashville-neighborhood-guide',
  'best-live-music-venues-nashville',
] as const;

export default async function HomePage() {
  const [{ events, live }, tours] = await Promise.all([
    getCalendar(),
    getToursCatalog({ count: 6 }),
  ]);
  const soon = live ? events.slice(0, 4) : [];
  const featuredExperiences = tours.live ? tours.experiences.slice(0, 6) : [];
  const startHere = START_HERE_SLUGS.map((slug) => guides.find((guide) => guide.slug === slug)).filter(
    (guide): guide is NonNullable<typeof guide> => Boolean(guide),
  );

  return (
    <>
      <HeroMedia>
        <div className="shell animate-hero-in">
          <div className="max-w-2xl">
            <h1 className="font-display text-[2rem] font-bold leading-[1.08] tracking-tight text-paper-card sm:text-5xl lg:text-hero">
              {site.headline}
            </h1>
            <p className="mt-3 max-w-lg text-base leading-relaxed text-paper-card/90 sm:text-lg">
              {site.description}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href="/plan/" className="btn-primary min-h-11 px-5">
                Plan Your Trip
              </Link>
              <Link
                href="#explore"
                className="btn min-h-11 border-paper-card/60 bg-navy/30 px-5 text-paper-card backdrop-blur-sm hover:bg-navy/50"
              >
                Explore Nashville
              </Link>
            </div>
          </div>
        </div>
      </HeroMedia>

      {/* Phones: stack under the hero so the widget is never clipped. Desktop: overlap the hero edge. */}
      <div className="shell relative z-10 mt-4 lg:-mt-10">
        <div className="mx-auto max-w-4xl animate-hero-in [animation-delay:60ms]">
          <BookingWidget />
        </div>
      </div>

      <section id="explore" className="shell scroll-mt-24 pb-12 pt-10 lg:pb-16 lg:pt-14">
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-[28px] lg:text-3xl">
          What are you here to do?
        </h2>
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
          {INTENT_HUBS.map((hub, index) => (
            <Link
              key={hub.href}
              href={hub.href}
              className="group flex flex-col overflow-hidden rounded-card border border-paper-edge bg-paper-card transition-colors hover:border-clay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
            >
              <SmartImage
                imageKey={hub.image}
                ratio="aspect-[4/3] sm:aspect-[16/10]"
                priority={index < 2}
                sizes="(max-width: 639px) 50vw, (max-width: 1023px) 50vw, 33vw"
              />
              <div className="flex flex-1 flex-col p-3 sm:p-5">
                <h3 className="font-sans text-[15px] font-bold leading-tight text-ink group-hover:text-clay sm:text-lg">
                  {hub.title}
                </h3>
                <p className="mt-1.5 hidden text-[15px] leading-relaxed text-ink-soft sm:block">
                  {hub.blurb}
                </p>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-paper-edge pt-6 sm:flex-row sm:items-center sm:gap-5">
          <p className="shrink-0 text-sm font-semibold text-ink">Planning a specific kind of trip?</p>
          <nav aria-label="Trip types" className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
            <ul className="flex gap-2 whitespace-nowrap sm:flex-wrap">
              {TRIP_TYPES.map(([label, href]) => (
                <li key={href} className="shrink-0">
                  <Link
                    href={href}
                    className="inline-flex min-h-11 items-center rounded-full border border-paper-edge bg-paper-card px-4 text-sm font-medium text-ink transition-colors hover:border-clay hover:text-clay"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </section>

      {featuredExperiences.length > 0 ? (
        <section className="border-y border-paper-edge bg-paper-card py-12 lg:py-16">
          <div className="shell">
            <SectionHeader
              title="Book a Nashville Experience"
              description="Live products and starting prices from Viator. Final availability and checkout are confirmed on Viator."
              href="/tours/"
              linkLabel="All tours"
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featuredExperiences.map((experience) => (
                <TourProductCard
                  key={experience.id}
                  product={experienceToProductSummary(experience)}
                  category={experience.categories[0]}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {soon.length > 0 ? (
        <section className="border-y border-paper-edge bg-paper-card py-12 lg:py-16">
          <div className="shell">
            <SectionHeader
              title="Live events coming up"
              href="/live-music-tonight/"
              linkLabel="Full live calendar"
            />
            <div className="grid gap-3 lg:grid-cols-2">
              {soon.map((event) => (
                <LiveEventCard key={`${event.source}-${event.id}`} item={event} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="border-y border-paper-edge bg-paper-card py-12 lg:py-16">
        <div className="shell">
          <SectionHeader
            title="Start here"
            description="Three reads that settle the shape of a first trip."
            href="/guides/"
            linkLabel="All guides"
          />
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-10">
            {startHere.map((guide) => (
              <GuideCard key={guide.slug} item={guide} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 lg:py-16">
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

      <section className="bg-cumberland py-12 text-paper-card lg:py-16">
        <div className="shell grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="max-w-md">
            <h2 className="text-2xl text-paper-card">How we choose</h2>
            <p className="mt-3 text-[16px] leading-relaxed text-paper-card/85">
              Recommendations come from local knowledge, editorial research, and continued review.
              Sponsored placements are labeled and never decide the ranking.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/how-we-choose/"
                className="btn min-h-11 border-paper-card/40 bg-transparent text-paper-card hover:bg-paper-card/10"
              >
                Our methodology
              </Link>
              <Link
                href="/editorial-standards/"
                className="btn min-h-11 border-paper-card/40 bg-transparent text-paper-card hover:bg-paper-card/10"
              >
                Editorial standards
              </Link>
            </div>
          </div>
          <div className="max-w-md lg:justify-self-end">
            <p className="text-2xs font-bold uppercase tracking-[0.14em] text-paper-card/70">
              {site.newsletter.name}
            </p>
            <h2 className="mt-2 text-2xl text-paper-card">{site.newsletter.promise}</h2>
            <div className="mt-5">
              <NewsletterForm location="homepage" tone="dark" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
