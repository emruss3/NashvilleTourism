import Link from 'next/link';
import { Breadcrumbs, PageHeader, SectionHeader } from '@/components/Ui';
import { AffiliateDisclosure } from '@/components/Trust';
import BookingWidget from '@/components/BookingWidget';
import BookingLink from '@/components/BookingLink';
import { partners } from '@/lib/partners';
import { ANALYTICS_EVENTS } from '@/lib/analytics';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Nashville Party Buses, Pedal Taverns & Tours',
  description:
    'Compare Nashville tour formats on group size, price range, and who each one suits, then check live availability for your dates.',
  path: '/tours/',
});

interface TourType {
  slug: string;
  name: string;
  /** One line. What you are actually buying. */
  what: string;
  groupSize: string;
  /** Broad per-person planning range. Never a quote. */
  price: string;
  bestFor: string;
  /** The one thing people get wrong about this format. */
  watchOut: string;
  /** Search term passed to the activity partner. */
  query: string;
}

const TOUR_TYPES: TourType[] = [
  {
    slug: 'party-bus',
    name: 'Party bus',
    what: 'An open-air or enclosed bus that loops downtown with music, usually BYOB, with a driver and a host.',
    groupSize: '10-30, sold by the seat or chartered whole',
    price: 'Roughly $40-$85 per person for a shared ride; private charters are priced by the vehicle and the hour',
    bestFor: 'Bachelor and bachelorette groups, birthdays, anyone who wants the transport to be the activity',
    watchOut: 'Confirm the alcohol policy and whether coolers, ice, and cups are provided before you turn up with a case of beer.',
    query: 'Party bus',
  },
  {
    slug: 'pedal-tavern',
    name: 'Pedal tavern',
    what: 'A pedal-powered bar on wheels that crawls a short downtown route while your group pedals it.',
    groupSize: '8-16, often a whole-vehicle booking',
    price: 'Roughly $35-$60 per person for a two-hour ride',
    bestFor: 'Daytime groups, first-timers, people who want photos more than distance covered',
    watchOut: 'You cover only a few blocks in two hours. Book it as an activity, not as transport between neighborhoods.',
    query: 'Pedal tavern',
  },
  {
    slug: 'honky-tonk-crawl',
    name: 'Honky-tonk crawl',
    what: 'A guided walk of several Lower Broadway bars with a host who handles the order and the timing.',
    groupSize: '10-25 on a shared crawl',
    price: 'Roughly $30-$70 per person, drinks usually extra',
    bestFor: 'First-time visitors, solo travelers, small groups who do not want to plan the night',
    watchOut: 'Entry to the bars on Broadway is free anyway. You are paying for the guide, the queue skipping where it exists, and the pacing.',
    query: 'Honky tonk bar crawl',
  },
  {
    slug: 'whiskey-tasting',
    name: 'Whiskey tasting',
    what: 'A guided tasting at one distillery, or a van tour that strings several Tennessee distilleries together.',
    groupSize: '6-20, some tours cap smaller',
    price: 'Roughly $50-$120 per person in town; full-day trips out to distilleries run higher',
    bestFor: 'Couples, groups who want a daytime activity, anyone tired of Broadway',
    watchOut: 'Day trips to distilleries outside the city can run six to eight hours door to door. Check the return time against your dinner plans.',
    query: 'Whiskey distillery tour',
  },
  {
    slug: 'city-sightseeing',
    name: 'City sightseeing',
    what: 'A bus, trolley, or amphibious vehicle circuit past the main landmarks with narration.',
    groupSize: '20-50, sold by the seat',
    price: 'Roughly $35-$75 per person',
    bestFor: 'First morning in town, families, mixed-mobility groups, rainy days',
    watchOut: 'Hop-on-hop-off passes only pay off if you actually get off. If you plan to ride once, book a single loop.',
    query: 'City sightseeing tour',
  },
  {
    slug: 'live-music-tour',
    name: 'Live music tour',
    what: 'A guided route through music history sites, studios, or a set of venues, often with a working musician hosting.',
    groupSize: '8-25',
    price: 'Roughly $40-$100 per person depending on whether venue admission is bundled',
    bestFor: 'Music-first trips, repeat visitors, anyone who wants context rather than a bar crawl',
    watchOut: 'Check whether studio interiors are included. Some routes only pass the buildings from outside.',
    query: 'Nashville music history tour',
  },
];

export default function ToursHub() {
  return (
    <div className="shell pb-16">
      <Breadcrumbs trail={[{ name: 'Tours', href: '/tours/' }]} />

      <PageHeader
        eyebrow="Book an activity"
        title="Party Buses, Pedal Taverns & Tours"
        intro="Six formats, six different nights. Pick the one that matches your group size and your budget, then check what is actually available on your dates."
      />

      <section className="py-6">
        <h2 className="sr-only">Check tour availability</h2>
        <BookingWidget />
      </section>

      <div className="py-2">
        <AffiliateDisclosure />
      </div>

      <section className="py-6">
        <SectionHeader
          eyebrow="Compare formats"
          title="Which tour fits your group"
          description="Prices are broad per-person planning ranges. Weekend, holiday, and private-charter pricing runs higher."
        />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOUR_TYPES.map((t) => (
            <li key={t.slug}>
              <article className="card flex h-full flex-col p-5">
                <h3 className="font-display text-lg leading-snug">{t.name}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{t.what}</p>

                <dl className="mt-4 space-y-2 border-t border-paper-edge pt-4 text-sm">
                  <div className="grid grid-cols-[6.5rem_1fr] gap-3">
                    <dt className="font-semibold text-ink">Group size</dt>
                    <dd className="text-ink-soft">{t.groupSize}</dd>
                  </div>
                  <div className="grid grid-cols-[6.5rem_1fr] gap-3">
                    <dt className="font-semibold text-ink">Price</dt>
                    <dd className="text-ink-soft">{t.price}</dd>
                  </div>
                  <div className="grid grid-cols-[6.5rem_1fr] gap-3">
                    <dt className="font-semibold text-ink">Best for</dt>
                    <dd className="text-ink-soft">{t.bestFor}</dd>
                  </div>
                  <div className="grid grid-cols-[6.5rem_1fr] gap-3">
                    <dt className="font-semibold text-ink">Watch out</dt>
                    <dd className="text-ink-soft">{t.watchOut}</dd>
                  </div>
                </dl>

                <div className="mt-auto pt-5 [&>a]:min-h-[44px]">
                  <BookingLink
                    url={partners.tours.build({ query: t.query })}
                    label="Check availability"
                    name={t.name}
                    slug={t.slug}
                    event={ANALYTICS_EVENTS.ACTIVITY_AFFILIATE_CLICKED}
                    partner={partners.tours.name}
                    placement="affiliate"
                  />
                </div>
              </article>
            </li>
          ))}
        </ul>
        <p className="mt-4 max-w-prose text-sm text-ink-faint">
          Ranges are planning estimates gathered from typical listings, not quotes, and they exclude
          tips and drinks. Check current pricing and the operator&rsquo;s own terms before you book.
        </p>
      </section>

      <section className="py-6">
        <h2 className="text-2xl sm:text-[28px]">Booking notes</h2>
        <ul className="mt-4 max-w-prose space-y-3">
          {[
            'Weekend slots for party buses and pedal taverns sell out weeks ahead in spring and autumn. Midweek is easier and cheaper.',
            'Most operators price a private charter by the vehicle. Above about ten people that often beats buying individual seats.',
            'Read the cancellation window before you pay. Free cancellation up to 24 hours is common but not universal.',
            'Tips for the driver and host are expected and are not included in the ticket price. Bring cash.',
          ].map((note) => (
            <li key={note} className="flex gap-3 text-[15px] leading-relaxed text-ink-soft">
              <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-clay" />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="py-6">
        <h2 className="text-2xl sm:text-[28px]">Plan the rest of the night</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/honky-tonk-highway/" className="btn-secondary min-h-[44px]">
            The Honky Tonk Highway
          </Link>
          <Link href="/where-to-stay/walkable-to-broadway/" className="btn-secondary min-h-[44px]">
            Hotels walkable to Broadway
          </Link>
          <Link href="/weekend/" className="btn-primary min-h-[44px]">
            The full weekend plan
          </Link>
        </div>
      </section>
    </div>
  );
}
