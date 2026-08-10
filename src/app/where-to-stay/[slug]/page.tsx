import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs, Chip, EmptyState, PageHeader, SectionHeader } from '@/components/Ui';
import { HotelCard } from '@/components/Cards';
import HubLead from '@/components/HubLead';
import { AffiliateDisclosure } from '@/components/Trust';
import BookingWidget from '@/components/BookingWidget';
import BookingLink from '@/components/BookingLink';
import { hotels } from '@/lib/content';
import { stayHubImageKey } from '@/lib/media-placements';
import { partners } from '@/lib/partners';
import { ANALYTICS_EVENTS, type AnalyticsEvent } from '@/lib/analytics';
import { buildMetadata } from '@/lib/seo';
import type { Hotel } from '@/lib/types';

interface Hub {
  slug: string;
  /** Visible h1. */
  title: string;
  /** Unique <title>, kept distinct from the h1 and from every other page. */
  metaTitle: string;
  metaDescription: string;
  /** One line under the h1. What this page decides for you. */
  intent: string;
  whoFor: string[];
  /** Three to five practical points. Bullets, never paragraphs. */
  whatToKnow: string[];
  /** Which of our hotel records belong on this page. */
  match: (h: Hotel) => boolean;
  bookingCta: {
    label: string;
    url: string;
    partner: string;
    event: AnalyticsEvent;
    /** Shown when no listing of ours matches, so the page still converts. */
    emptyNote: string;
  };
}

const HUBS: Hub[] = [
  {
    slug: 'boutique-hotels-downtown',
    title: 'Boutique Hotels Downtown',
    metaTitle: 'Boutique Hotels in Downtown Nashville',
    metaDescription:
      'Small-format downtown Nashville hotels for couples and pairs of couples, with notes on noise, parking, and what boutique actually costs you here.',
    intent: 'Smaller properties in and around the core, for people who want character over room count.',
    whoFor: ['Couples', 'Two or three couples travelling together', 'Repeat visitors', 'Anyone who hates a lobby queue'],
    whatToKnow: [
      'Boutique here usually means under 150 rooms, a bar on the ground floor, and rooms that run smaller than a chain equivalent at the same rate.',
      'Almost none of them have a self-park garage. Budget for valet on top of the room rate.',
      'Germantown and the Gulch sit close enough to walk in and far enough to sleep. The blocks directly on Broadway do not.',
      'Weekend minimums of two nights are common in spring and autumn.',
    ],
    match: (h) => ['downtown-broadway', 'the-gulch', 'germantown'].includes(h.neighborhood),
    bookingCta: {
      label: 'Check downtown rates',
      url: partners.hotels.build({ area: 'Downtown' }),
      partner: partners.hotels.name,
      event: ANALYTICS_EVENTS.HOTEL_AFFILIATE_CLICKED,
      emptyNote: 'Search downtown availability directly for your dates.',
    },
  },
  {
    slug: 'group-rentals-bachelor-bachelorette',
    title: 'Best Rentals for Bachelor & Bachelorette Groups',
    metaTitle: 'Nashville Group Rentals for Bachelor & Bachelorette Parties',
    metaDescription:
      'Whole-home rentals for Nashville bachelor and bachelorette groups: how many beds you actually need, what to check before booking, and where to search.',
    intent: 'Groups of six or more are usually better off in one whole home than in five hotel rooms.',
    whoFor: ['Bachelor parties', 'Bachelorette parties', 'Groups of 6-16', 'Anyone who wants one address for the weekend'],
    whatToKnow: [
      'Count beds, not bedrooms. Listings often reach their headline sleeps number using sofa beds and air mattresses.',
      'Confirm the permit status and the party policy in writing. Nashville enforces short-term rental rules and noise complaints, and a cancelled listing days before the trip is the common failure.',
      'A home east of the river or in Germantown puts you a short ride from Broadway without a downtown premium. Downtown rentals cost more and still need a plan for parking.',
      'Split the cost per person before you compare against hotels. Cleaning and service fees can move a rental from cheaper to more expensive.',
      'Book transport separately. A party bus or a pedal tavern is a different reservation from your stay.',
    ],
    match: (h) => h.bestFor.some((b) => /group|bachelor/i.test(b)),
    bookingCta: {
      label: 'Search whole-home rentals',
      url: partners.rentals.build({ adults: 10 }),
      partner: partners.rentals.name,
      event: ANALYTICS_EVENTS.HOTEL_AFFILIATE_CLICKED,
      emptyNote: 'Search whole-home rentals sized for your group.',
    },
  },
  {
    slug: 'luxury-resorts-opryland',
    title: 'Luxury Resorts near Opryland',
    metaTitle: 'Nashville Resorts near Opryland and Music Valley',
    metaDescription:
      'What a resort stay near Opryland and Music Valley gets you, what it costs you in travel time to downtown Nashville, and how to check availability.',
    intent: 'A resort campus about twenty to thirty minutes from downtown. You trade walkability for space.',
    whoFor: ['Families', 'Conference and convention trips', 'Driving trips', 'Multi-generation groups'],
    whatToKnow: [
      'Nothing out here is walkable to Broadway. Plan on a car, a rideshare each way, or a shuttle if your property runs one.',
      'Resort and parking fees are often charged on top of the nightly rate. Read the fee line before you compare with a downtown room.',
      'The area suits trips where the property is the point. If your plan is honky-tonks every night, stay downtown instead.',
      'Rates climb around large conventions and holiday programming, and blocks sell out well ahead.',
    ],
    match: (h) => h.nearbyAttractions.some((a) => /opry|music valley/i.test(a)),
    bookingCta: {
      label: 'Check Music Valley availability',
      url: partners.hotels.build({ area: 'Music Valley' }),
      partner: partners.hotels.name,
      event: ANALYTICS_EVENTS.HOTEL_AFFILIATE_CLICKED,
      emptyNote:
        'We do not have a verified listing in Music Valley yet. Search the area directly for your dates.',
    },
  },
  {
    slug: 'walkable-to-broadway',
    title: 'Hotels Walkable to Broadway',
    metaTitle: 'Nashville Hotels Within Walking Distance of Broadway',
    metaDescription:
      'Which Nashville areas actually put you within a walk of Lower Broadway, how loud each one gets, and where to check rates for your dates.',
    intent: 'Sleep close enough to walk home from the strip at 1am without opening a rideshare app.',
    whoFor: ['First-time visitors', 'Short trips', 'Groups doing a bar crawl', 'Anyone without a car'],
    whatToKnow: [
      'Downtown blocks, the Gulch, and the near edge of Germantown all work on foot. Everything else needs a ride.',
      'The closer you sleep to the strip, the more bass you hear through the window. Ask for a high floor away from the street side.',
      'Downtown parking is garage-only in practice and charged nightly. Skip the car if your plan is walkable anyway.',
      'Rates on the Broadway blocks jump on Friday and Saturday and around arena events. Midweek is a different price entirely.',
    ],
    match: (h) => ['downtown-broadway', 'the-gulch'].includes(h.neighborhood),
    bookingCta: {
      label: 'Check rates near Broadway',
      url: partners.hotels.build({ area: 'Broadway' }),
      partner: partners.hotels.name,
      event: ANALYTICS_EVENTS.HOTEL_AFFILIATE_CLICKED,
      emptyNote: 'Search availability on and around Lower Broadway.',
    },
  },
  {
    slug: 'hotels-with-pools',
    title: 'Hotels with Pools',
    metaTitle: 'Nashville Hotels with Pools: Rooftop and Indoor',
    metaDescription:
      'Nashville hotels with pools, split by rooftop and indoor, plus the access rules and seasonal closures worth checking before you book.',
    intent: 'A pool is the difference between a good July afternoon and a wasted one.',
    whoFor: ['Summer trips', 'Families', 'Groups who want a daytime base', 'Anyone travelling June to September'],
    whatToKnow: [
      'Rooftop pools downtown are often seasonal and sometimes run as ticketed day clubs on weekends. Confirm guest access is included.',
      'Indoor pools are more common in the suburban properties and stay open year round.',
      'Check whether children are allowed. Several downtown rooftops are adults-only after a certain hour.',
      'Pools close for private events. If it matters to your trip, ask the property to confirm your dates.',
    ],
    match: (h) => h.hasPool,
    bookingCta: {
      label: 'Check hotels with pools',
      url: partners.hotels.build({}),
      partner: partners.hotels.name,
      event: ANALYTICS_EVENTS.HOTEL_AFFILIATE_CLICKED,
      emptyNote: 'Search availability and filter for a pool.',
    },
  },
  {
    slug: 'value-stays-midtown',
    title: 'Value Stays in Midtown',
    metaTitle: 'Midtown Nashville Hotels: Value Stays near Music Row',
    metaDescription:
      'Midtown Nashville hotels for travelers who want a short ride to Broadway without downtown rates, with notes on parking, noise, and getting around.',
    intent: 'Ten minutes from Broadway, priced like it is not. The trade is a ride each way.',
    whoFor: ['Budget-conscious trips', 'Business travel', 'Younger groups', 'Longer stays'],
    whatToKnow: [
      'Midtown sits between Music Row and Vanderbilt. Expect a short rideshare to Broadway rather than a walk.',
      'Several properties include parking or charge far less for it than downtown, which is real money over three nights.',
      'The bar strip near the university gets loud on weekends and during football season. Rooms facing away from it are quieter.',
      'Free breakfast is more common here than downtown. Worth counting when you compare nightly rates.',
    ],
    match: (h) => h.neighborhood === 'midtown' || h.priceCategory === '$$',
    bookingCta: {
      label: 'Check Midtown rates',
      url: partners.hotels.build({ area: 'Midtown' }),
      partner: partners.hotels.name,
      event: ANALYTICS_EVENTS.HOTEL_AFFILIATE_CLICKED,
      emptyNote: 'Search Midtown availability for your dates.',
    },
  },
];

function getHub(slug: string): Hub | undefined {
  return HUBS.find((h) => h.slug === slug);
}

export function generateStaticParams() {
  return HUBS.map((h) => ({ slug: h.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const hub = getHub(params.slug);
  if (!hub) {
    return buildMetadata({
      title: 'Not found',
      description: '',
      path: '/where-to-stay/',
      noindex: true,
    });
  }
  return buildMetadata({
    title: hub.metaTitle,
    description: hub.metaDescription,
    path: `/where-to-stay/${hub.slug}/`,
  });
}

export default function StaySubHub({ params }: { params: { slug: string } }) {
  const hub = getHub(params.slug);
  if (!hub) notFound();

  const matches = hotels.filter(hub.match);

  return (
    <div className="shell pb-16">
      <Breadcrumbs
        trail={[
          { name: 'Where to Stay', href: '/where-to-stay/' },
          { name: hub.title, href: `/where-to-stay/${hub.slug}/` },
        ]}
      />

      <PageHeader
        eyebrow="Where to stay"
        title={hub.title}
        intro={hub.intent}
        meta={
          <div className="flex flex-wrap gap-2">
            {hub.whoFor.map((w) => (
              <Chip key={w}>{w}</Chip>
            ))}
          </div>
        }
      />
      {stayHubImageKey(hub.slug) ? <HubLead imageKey={stayHubImageKey(hub.slug)!} /> : null}

      <section className="py-6">
        <h2 className="sr-only">Check rates and availability</h2>
        <BookingWidget />
      </section>

      <section className="py-6">
        <SectionHeader
          title={matches.length > 0 ? 'Our picks' : 'Our listings'}
          description={
            matches.length > 0
              ? `${matches.length} of our ${hotels.length} hotel listings fit this.`
              : undefined
          }
        />
        {matches.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {matches.map((h) => (
              <HotelCard key={h.slug} item={h} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No listing of ours fits this yet"
            description={hub.bookingCta.emptyNote}
            action={
              <Link href="/hotels/" className="btn-secondary min-h-[44px]">
                Browse all our hotels
              </Link>
            }
          />
        )}
      </section>

      <section className="py-6">
        <h2 className="text-2xl sm:text-[28px]">What to know before you book</h2>
        <ul className="mt-4 max-w-prose space-y-3">
          {hub.whatToKnow.map((point) => (
            <li key={point} className="flex gap-3 text-[15px] leading-relaxed text-ink-soft">
              <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-clay" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="py-6">
        <div className="rounded-card border border-paper-edge bg-white p-6">
          <h2 className="font-display text-xl">{hub.bookingCta.label}</h2>
          <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-ink-soft">
            Rates and availability change daily. Search your exact dates through {hub.bookingCta.partner}.
          </p>
          <div className="mt-4 max-w-sm [&>a]:min-h-[44px]">
            <BookingLink
              url={hub.bookingCta.url}
              label={hub.bookingCta.label}
              name={hub.title}
              slug={hub.slug}
              event={hub.bookingCta.event}
              partner={hub.bookingCta.partner}
              placement="affiliate"
            />
          </div>
          <div className="mt-4">
            <AffiliateDisclosure compact />
          </div>
        </div>
      </section>

      <section className="py-6">
        <h2 className="text-2xl sm:text-[28px]">Other ways to narrow it down</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {HUBS.filter((h) => h.slug !== hub.slug).map((h) => (
            <li key={h.slug}>
              <Link
                href={`/where-to-stay/${h.slug}/`}
                className="flex min-h-[44px] items-center rounded-card border border-paper-edge bg-white px-4 py-3 text-[15px] font-semibold text-ink transition-shadow hover:shadow-lift"
              >
                {h.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
