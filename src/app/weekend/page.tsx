import Link from 'next/link';
import { Breadcrumbs, PageHeader, SectionHeader } from '@/components/Ui';
import { AffiliateDisclosure } from '@/components/Trust';
import BookingWidget from '@/components/BookingWidget';
import BookingLink from '@/components/BookingLink';
import { partners } from '@/lib/partners';
import { ANALYTICS_EVENTS, type AnalyticsEvent } from '@/lib/analytics';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'NASHVILLE Weekender: Friday to Sunday',
  description:
    'A tight Friday-to-Sunday Nashville plan, three slots a day, each one linked to what to book and where to stay. Built to be followed, not read.',
  path: '/weekend/',
});

interface Slot {
  time: string;
  title: string;
  /** One or two sentences. No more. */
  note: string;
  href?: string;
  linkLabel?: string;
}

interface Day {
  id: string;
  day: string;
  theme: string;
  slots: Slot[];
  cta: {
    label: string;
    url: string;
    partner: string;
    event: AnalyticsEvent;
    slug: string;
    note: string;
  };
}

const DAYS: Day[] = [
  {
    id: 'friday',
    day: 'Friday',
    theme: 'Land, drop bags, go downtown',
    slots: [
      {
        time: 'Morning',
        title: 'Arrive and check in',
        note: 'Reach downtown from the airport in about 15 to 25 minutes. Leave the car behind if you are staying within walking distance of Broadway.',
        href: '/where-to-stay/walkable-to-broadway/',
        linkLabel: 'Hotels walkable to Broadway',
      },
      {
        time: 'Afternoon',
        title: 'One museum, then the strip in daylight',
        note: 'Give the Country Music Hall of Fame about two hours, then walk Broadway while it is still easy to move.',
        href: '/things-to-do/country-music-hall-of-fame/',
        linkLabel: 'Country Music Hall of Fame',
      },
      {
        time: 'Evening',
        title: 'Dinner, then the honky-tonks',
        note: 'Eat before 7pm or expect a wait. Then work the strip from the river end upward so the crowds build as you go.',
        href: '/honky-tonk-highway/',
        linkLabel: 'The Honky Tonk Highway',
      },
    ],
    cta: {
      label: 'Check hotel rates',
      url: partners.hotels.build({ area: 'Downtown' }),
      partner: partners.hotels.name,
      event: ANALYTICS_EVENTS.HOTEL_AFFILIATE_CLICKED,
      slug: 'weekend-friday-hotel',
      note: 'Friday and Saturday rates move fast downtown. Lock the room first.',
    },
  },
  {
    id: 'saturday',
    day: 'Saturday',
    theme: 'One neighborhood, one big night',
    slots: [
      {
        time: 'Morning',
        title: 'Breakfast and a walk out of downtown',
        note: 'Start in Germantown or East Nashville. Both are a short ride and both are far calmer than Broadway on a Saturday morning.',
        href: '/neighborhoods/germantown/',
        linkLabel: 'Germantown',
      },
      {
        time: 'Afternoon',
        title: 'Pick one: shopping, a park, or a party bus',
        note: '12 South covers the shopping in an afternoon. Groups usually swap it for a pedal tavern or a bus loop instead.',
        href: '/tours/',
        linkLabel: 'Party buses and tours',
      },
      {
        time: 'Evening',
        title: 'A ticketed show, then back to the bars',
        note: 'A seated show at the Ryman or a listening room gives the night a shape. Broadway is still going when it ends.',
        href: '/music/ryman-auditorium/',
        linkLabel: 'Ryman Auditorium',
      },
    ],
    cta: {
      label: 'Check tour availability',
      url: partners.tours.build({ query: 'Party bus' }),
      partner: partners.tours.name,
      event: ANALYTICS_EVENTS.ACTIVITY_AFFILIATE_CLICKED,
      slug: 'weekend-saturday-tour',
      note: 'Saturday slots for buses and pedal taverns go weeks ahead in spring and autumn.',
    },
  },
  {
    id: 'sunday',
    day: 'Sunday',
    theme: 'Slow down, then leave',
    slots: [
      {
        time: 'Morning',
        title: 'Long brunch, no schedule',
        note: 'Sunday brunch runs late across the city. Book it if your group is over four.',
        href: '/restaurants/',
        linkLabel: 'Restaurants',
      },
      {
        time: 'Afternoon',
        title: 'One outdoor stop before the airport',
        note: 'Centennial Park and the Parthenon, or the greenway east of the river, both fit inside two hours.',
        href: '/things-to-do/the-parthenon/',
        linkLabel: 'The Parthenon',
      },
      {
        time: 'Evening',
        title: 'Fly out, or stay for a quiet show',
        note: 'If you have a late flight, a Sunday show is the calmest music you will hear all weekend.',
        href: '/music/',
        linkLabel: 'Live music venues',
      },
    ],
    cta: {
      label: 'Find tickets',
      url: partners.tickets.build({}),
      partner: partners.tickets.name,
      event: ANALYTICS_EVENTS.TICKET_AFFILIATE_CLICKED,
      slug: 'weekend-sunday-tickets',
      note: 'Check what is on before you commit the evening.',
    },
  },
];

export default function WeekendHub() {
  return (
    <div className="shell pb-16">
      <Breadcrumbs trail={[{ name: 'Weekend', href: '/weekend/' }]} />

      <PageHeader
        eyebrow="Friday to Sunday"
        title="NASHVILLE Weekender"
        intro="Three slots a day, three days. Book the room, one show, and one dinner, and leave the rest loose."
      />

      <section className="py-6">
        <h2 className="sr-only">Book your weekend</h2>
        <BookingWidget />
      </section>

      <div className="py-2">
        <AffiliateDisclosure />
      </div>

      <nav aria-label="Jump to a day" className="flex flex-wrap gap-2 py-4">
        {DAYS.map((d) => (
          <a
            key={d.id}
            href={`#${d.id}`}
            className="inline-flex min-h-[44px] items-center rounded-full border border-paper-edge bg-white px-4 text-sm font-semibold text-ink-soft transition-colors hover:border-clay hover:text-clay"
          >
            {d.day}
          </a>
        ))}
      </nav>

      {DAYS.map((d) => (
        <section key={d.id} id={d.id} className="scroll-mt-24 py-6">
          <SectionHeader eyebrow={d.day} title={d.theme} />

          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {d.slots.map((s) => (
              <li key={s.time}>
                <article className="card flex h-full flex-col gap-2 p-5">
                  <p className="eyebrow">{s.time}</p>
                  <h3 className="font-sans text-lg font-bold leading-snug">{s.title}</h3>
                  <p className="flex-1 text-[15px] leading-relaxed text-ink-soft">{s.note}</p>
                  {s.href && s.linkLabel && (
                    <Link
                      href={s.href}
                      className="mt-1 inline-flex min-h-[44px] items-center text-sm font-semibold text-clay underline underline-offset-4 hover:text-clay-deep"
                    >
                      {s.linkLabel}
                    </Link>
                  )}
                </article>
              </li>
            ))}
          </ol>

          <div className="mt-4 flex flex-col gap-3 rounded-card border border-paper-edge bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-prose text-[15px] text-ink-soft">{d.cta.note}</p>
            <div className="w-full shrink-0 sm:w-64 [&>a]:min-h-[44px]">
              <BookingLink
                url={d.cta.url}
                label={d.cta.label}
                name={`${d.day} booking`}
                slug={d.cta.slug}
                event={d.cta.event}
                partner={d.cta.partner}
                placement="affiliate"
              />
            </div>
          </div>
        </section>
      ))}

      <section className="py-6">
        <h2 className="text-2xl sm:text-[28px]">Make it yours</h2>
        <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-ink-soft">
          This plan assumes two to four people, a downtown base, and no car. Change any of those and
          the shape changes with it.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/plan/" className="btn-primary min-h-[44px]">
            Build a custom plan
          </Link>
          <Link href="/where-to-stay/" className="btn-secondary min-h-[44px]">
            Compare where to stay
          </Link>
          <Link href="/events/this-weekend/" className="btn-secondary min-h-[44px]">
            What&rsquo;s on this weekend
          </Link>
          <Link href="/guides/nashville-weekend-itinerary/" className="btn-secondary min-h-[44px]">
            The long-form itinerary
          </Link>
          <Link href="/guides/nashville-bachelorette-guide/" className="btn-secondary min-h-[44px]">
            Running a group weekend
          </Link>
          <Link href="/honky-tonk-highway/" className="btn-secondary min-h-[44px]">
            The Honky Tonk Highway
          </Link>
        </div>
      </section>
    </div>
  );
}
