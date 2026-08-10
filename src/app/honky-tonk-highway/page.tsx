import Link from 'next/link';
import { Breadcrumbs, MapLink, PageHeader, ScrollableTable, SectionHeader } from '@/components/Ui';
import HubLead from '@/components/HubLead';
import { AffiliateDisclosure } from '@/components/Trust';
import BookingLink from '@/components/BookingLink';
import { partners } from '@/lib/partners';
import { ANALYTICS_EVENTS } from '@/lib/analytics';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Honky Tonk Highway: How to Do Lower Broadway',
  description:
    'A block-by-block orientation to the Honky Tonk Highway: what sits on each stretch of Lower Broadway, when to go, tipping rules, and where to stay within walking distance.',
  path: '/honky-tonk-highway/',
});

/** Orientation by block. Describes the strip and bar formats, not named businesses. */
const BLOCKS: { block: string; whatIsThere: string; crowd: string; useItFor: string }[] = [
  {
    block: '1st to 2nd Avenue',
    whatIsThere:
      'The river end. Fewer honky-tonks, more restaurants and garages, with the pedestrian bridge and the riverfront a short walk away.',
    crowd: 'Lightest on the strip',
    useItFor: 'Parking, dinner before the night starts, skyline photos from the bridge',
  },
  {
    block: '2nd to 3rd Avenue',
    whatIsThere:
      'A mix of large multi-floor bars and restaurants. Second Avenue itself runs north off Broadway with its own set of bars.',
    crowd: 'Moderate, fills after dark',
    useItFor: 'A first drink, groups that want space to stand',
  },
  {
    block: '3rd to 4th Avenue',
    whatIsThere:
      'The dense middle. Smaller, older-format rooms sit along here alongside newer ones, most of them narrow, loud, and standing-room.',
    crowd: 'Busy from mid-afternoon',
    useItFor: 'Hearing a band up close, bar-hopping without walking far',
  },
  {
    block: '4th to 5th Avenue',
    whatIsThere:
      'The big multi-floor bars, several of them artist-branded, most with a rooftop and a different band on each floor.',
    crowd: 'Heaviest on the strip',
    useItFor: 'Rooftops, big groups, the version of Broadway people picture',
  },
  {
    block: '5th Avenue, one block north',
    whatIsThere:
      'The Ryman Auditorium, a ticketed concert hall rather than a bar. The alley behind it connects through to Broadway.',
    crowd: 'Show-dependent',
    useItFor: 'A seated show that anchors the evening',
  },
  {
    block: '5th and Broadway, and a block south',
    whatIsThere:
      'Bridgestone Arena on the corner, with the Country Music Hall of Fame and the convention district just south on Demonbreun.',
    crowd: 'Spikes hard on event nights',
    useItFor: 'Arena shows and hockey, daytime museum visits',
  },
  {
    block: 'Printers Alley, several blocks north',
    whatIsThere:
      'A short historic alley off the main strip with a different, older bar culture. Cover charges are more common here than on Broadway.',
    crowd: 'Moderate, late-leaning',
    useItFor: 'Getting off the strip without leaving downtown',
  },
];

const TIMING: { when: string; crowd: string; expect: string }[] = [
  {
    when: 'Weekday, 11am to 2pm',
    crowd: 'Light',
    expect: 'Bands are already playing. You can walk into almost anywhere and get a seat at the bar.',
  },
  {
    when: 'Weekday, 2pm to 6pm',
    crowd: 'Moderate',
    expect: 'Rooftops start filling. Still easy for a group of four to move between bars.',
  },
  {
    when: 'Weekday, 6pm to close',
    crowd: 'Busy',
    expect: 'Standing room in the popular rooms. Doors are still moving quickly.',
  },
  {
    when: 'Friday and Saturday, noon to 5pm',
    crowd: 'Busy',
    expect: 'Party buses and pedal taverns are circling. Groups arrive in waves.',
  },
  {
    when: 'Friday and Saturday, 8pm to close',
    crowd: 'Packed',
    expect: 'Queues at the busiest doors, slow bar service, and groups over four struggle to stay together.',
  },
  {
    when: 'Sunday afternoon',
    crowd: 'Moderate',
    expect: 'The calmest weekend window. Good for a first pass if you arrived Saturday night.',
  },
];

export default function HonkyTonkHighway() {
  return (
    <div className="shell pb-16">
      <Breadcrumbs trail={[{ name: 'Honky Tonk Highway', href: '/honky-tonk-highway/' }]} />

      <PageHeader
        eyebrow="Lower Broadway"
        title="The Honky Tonk Highway Guide"
        intro="Roughly five blocks of Broadway between the river and 5th Avenue. Walkable end to end in about fifteen minutes. Here is how the strip is laid out and when to walk it."
        meta={<MapLink query="Lower Broadway, Nashville, TN" label="Open Lower Broadway in maps" />}
      />
      <HubLead imageKey="neighborhood/downtown-broadway" />

      <section className="py-6">
        <SectionHeader title="How it works" />
        <ul className="max-w-prose space-y-3">
          {[
            'Entry is free at the honky-tonks on the strip. There is no cover and no guest list. You walk in, and you walk out when you want.',
            'The bands are paid by the tip bucket, not by the bar. Cash in the bucket once a set is the norm, more if you request a song.',
            'The big bars run several floors with a different band on each. If the ground floor is packed, go up.',
            'Music starts late morning and runs in sets until close, so an afternoon visit gets you the same format with a fraction of the crowd.',
            'Bar staff work on tips too. Opening a tab and tipping per round both work.',
          ].map((point) => (
            <li key={point} className="flex gap-3 text-[15px] leading-relaxed text-ink-soft">
              <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-clay" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="py-6">
        <SectionHeader
          eyebrow="Orientation"
          title="Block by block"
          description="What sits on each stretch, so you can start at the right end instead of walking the strip twice."
        />
        <ScrollableTable label="Lower Broadway blocks and what sits on each">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <caption className="sr-only">
              Lower Broadway and the surrounding downtown blocks, with what sits on each, how busy it
              gets, and what to use it for.
            </caption>
            <thead className="bg-paper-card">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold text-ink">
                  Block
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-ink">
                  What&rsquo;s there
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-ink">
                  Crowd
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-ink">
                  Use it for
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-edge">
              {BLOCKS.map((b) => (
                <tr key={b.block}>
                  <th scope="row" className="px-4 py-3 text-left font-semibold text-ink">
                    {b.block}
                  </th>
                  <td className="px-4 py-3 text-ink-soft">{b.whatIsThere}</td>
                  <td className="px-4 py-3 text-ink-soft">{b.crowd}</td>
                  <td className="px-4 py-3 text-ink-soft">{b.useItFor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollableTable>
        <p className="mt-3 max-w-prose text-sm text-ink-faint">
          Bars on the strip open, close, and change hands often. Treat this as orientation to the
          geography rather than a list of businesses, and check any specific venue&rsquo;s own hours
          before you plan around it.
        </p>
      </section>

      <section className="py-6">
        <SectionHeader eyebrow="Timing" title="When to go" />
        <ScrollableTable label="Crowd levels on Lower Broadway by day and time">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <caption className="sr-only">
              Crowd levels on Lower Broadway by day and time, with what to expect in each window.
            </caption>
            <thead className="bg-paper-card">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold text-ink">
                  Day and time
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-ink">
                  Crowd level
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-ink">
                  What to expect
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-edge">
              {TIMING.map((t) => (
                <tr key={t.when}>
                  <th scope="row" className="px-4 py-3 text-left font-semibold text-ink">
                    {t.when}
                  </th>
                  <td className="px-4 py-3 text-ink-soft">{t.crowd}</td>
                  <td className="px-4 py-3 text-ink-soft">{t.expect}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollableTable>
        <p className="mt-3 max-w-prose text-sm text-ink-faint">
          Festival weekends, football Sundays, and arena events override all of this. Check the
          arena and Ryman calendars before you pick a night.
        </p>
      </section>

      <section className="py-6">
        <SectionHeader eyebrow="Practical" title="Rules of the strip" />
        <ul className="max-w-prose space-y-3">
          {[
            'Bring cash. Tip buckets, and some doors and merch tables, are cash-first even where the bar takes cards.',
            'Carry ID every time. Most rooms card at the door regardless of age, and many go 21-and-over in the evening.',
            'No cover on the strip itself. If someone asks for a cover charge on Broadway, you are probably at a ticketed venue or off the main run.',
            'Requests are paid. Twenty dollars in the bucket gets a song far more reliably than shouting one.',
            'Groups over six should split up or expect to wait. Doors do not hold space, and no honky-tonk on the strip takes a reservation.',
            'Drive nothing. Parking is garage-only in practice and expensive on event nights, and the whole strip is walkable.',
          ].map((rule) => (
            <li key={rule} className="flex gap-3 text-[15px] leading-relaxed text-ink-soft">
              <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-clay" />
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="py-6">
        <div className="rounded-card border border-paper-edge bg-white p-6">
          <h2 className="font-display text-xl">Book the night</h2>
          <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-ink-soft">
            A guided crawl handles the order and the pacing. A room within walking distance means you
            never need a ride home.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 [&_a]:min-h-[44px]">
            <Link href={partners.tours.marketplacePath({ query: 'Honky tonk bar crawl' })} className="btn-primary min-h-[44px] w-full text-center">
              Search bar crawl experiences
            </Link>
            <BookingLink
              url={partners.hotels.build({ area: 'Broadway' })}
              label="Check hotels near Broadway"
              name="Hotels walkable to Broadway"
              slug="walkable-to-broadway"
              event={ANALYTICS_EVENTS.HOTEL_AFFILIATE_CLICKED}
              partner={partners.hotels.name}
              placement="affiliate"
            />
          </div>
          <div className="mt-4">
            <AffiliateDisclosure compact />
          </div>
        </div>
      </section>

      <section className="py-6">
        <h2 className="text-2xl sm:text-[28px]">Next</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/where-to-stay/walkable-to-broadway/" className="btn-secondary min-h-[44px]">
            Hotels walkable to Broadway
          </Link>
          <Link href="/tours/" className="btn-secondary min-h-[44px]">
            Party buses and tours
          </Link>
          <Link href="/music/ryman-auditorium/" className="btn-secondary min-h-[44px]">
            Ryman Auditorium
          </Link>
          <Link href="/neighborhoods/downtown-broadway/" className="btn-secondary min-h-[44px]">
            Downtown neighborhood guide
          </Link>
          <Link href="/music/" className="btn-secondary min-h-[44px]">
            Live music venues
          </Link>
          <Link href="/weekend/" className="btn-primary min-h-[44px]">
            The full weekend plan
          </Link>
        </div>
      </section>
    </div>
  );
}
