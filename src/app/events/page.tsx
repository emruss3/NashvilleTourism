import Link from 'next/link';
import { Suspense } from 'react';
import { SmartImage } from '@/components/Media';
import { Breadcrumbs, LoadingState } from '@/components/Ui';
import type { ImageKey } from '@/lib/media';
import { getCalendar } from '@/lib/feeds/calendar';
import { buildMetadata } from '@/lib/seo';
import EventsClient from './EventsClient';

export const revalidate = 1800;

export const metadata = buildMetadata({
  title: 'Nashville Events',
  description:
    'Concerts, sports, theater, and ticketed events at Nashville venues, with current listings supplied by Ticketmaster.',
  path: '/events/',
});

const EVENT_PATHS: {
  label: string;
  description: string;
  href: string;
  image: ImageKey;
  featured?: boolean;
}[] = [
  {
    label: 'Upcoming Events',
    description: 'See what is coming up across Nashville.',
    href: '#upcoming',
    image: 'music/ascend-amphitheater',
  },
  {
    label: 'Festivals',
    description: 'Music and major event weekends on the current calendar.',
    href: '#upcoming',
    image: 'hub/tickets',
  },
  {
    label: 'Live Music',
    description: 'Find a Nashville show for tonight or this weekend.',
    href: '/live-music-tonight/',
    image: 'hub/honky-tonk-highway',
    featured: true,
  },
  {
    label: 'This Weekend',
    description: 'A Friday-to-Sunday view of current Nashville events.',
    href: '/events/this-weekend/',
    image: 'hub/weekend',
  },
  {
    label: 'Sporting Events',
    description: 'Games and major sporting events at Nashville venues.',
    href: '/events/?category=Sports#upcoming',
    image: 'neighborhood/downtown-broadway',
  },
];

const CATEGORY_INTRO: Record<string, string> = {
  Sports:
    'Sports listings cover ticketed games and major sporting events at Nashville arenas and stadiums. Pair a game night with a Downtown hotel or a short ride from Midtown, and leave Broadway for after the final whistle when the strip is busiest.',
  Music:
    'Music events here are ticketed concerts and theater dates. For a tonight-first view with filters, use the live music calendar; for free Broadway stages, see the honky-tonk highway guide.',
  Arts:
    'Arts and theater dates sit alongside concerts on the Ticketmaster feed. Confirm venue and start time before you lock dinner nearby.',
};

export default async function EventsIndex({
  searchParams,
}: {
  searchParams?: { category?: string };
}) {
  const { events, live, configured } = await getCalendar();
  const category = searchParams?.category?.trim() || null;
  const categoryIntro = category ? CATEGORY_INTRO[category] : null;

  return (
    <>
      <div className="shell">
        <Breadcrumbs trail={[{ name: 'Events', href: '/events/' }]} />
      </div>

      <section className="bg-cumberland pb-14 pt-12 text-paper-card lg:pb-16">
        <div className="shell">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow text-dogwood">What&apos;s on</p>
            <h1 className="mt-2 text-4xl font-bold text-paper-card sm:text-5xl">
              {category ? `Nashville ${category} Events` : 'Nashville Events'}
            </h1>
            <p className="mt-3 text-body leading-relaxed text-paper-card/80">
              {categoryIntro ||
                'Current ticketed events at Nashville venues—concerts, sports, theater, and more.'}
            </p>
          </div>

          <div className="mt-9 grid grid-cols-2 items-end gap-2 sm:gap-3 lg:grid-cols-5">
            {EVENT_PATHS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`group relative overflow-hidden rounded-card border border-paper-card/15 bg-navy shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dogwood ${
                  item.featured
                    ? 'col-span-2 h-[25rem] sm:h-[28rem] lg:col-span-1'
                    : 'h-[17rem] sm:h-[20rem] lg:h-[18rem]'
                }`}
              >
                <SmartImage
                  imageKey={item.image}
                  ratio="absolute inset-0"
                  className="transition-transform duration-500 group-hover:scale-[1.03]"
                  sizes={item.featured ? '(max-width: 1024px) 100vw, 24vw' : '(max-width: 1024px) 50vw, 19vw'}
                  priority={item.featured}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/15 to-transparent" aria-hidden="true" />
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                  {item.featured && <p className="eyebrow mb-1 text-dogwood">Tonight</p>}
                  <h2 className="font-sans text-lg font-bold uppercase tracking-[0.04em] text-paper-card sm:text-xl">
                    {item.label}
                  </h2>
                  <p className="mt-1 hidden text-sm leading-snug text-paper-card/75 sm:block">
                    {item.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="shell pb-16 pt-8">
        <section className="max-w-3xl space-y-4 pb-8 text-[15px] leading-relaxed text-ink-soft">
          <p>
            This hub lists ticketed Nashville events from the live feed. Jump to{' '}
            <Link
              href="/live-music-tonight/"
              className="text-clay underline underline-offset-2 hover:text-clay-deep"
            >
              live music tonight
            </Link>
            ,{' '}
            <Link
              href="/events/this-weekend/"
              className="text-clay underline underline-offset-2 hover:text-clay-deep"
            >
              this weekend
            </Link>
            , or{' '}
            <Link
              href="/events/?category=Sports#upcoming"
              className="text-clay underline underline-offset-2 hover:text-clay-deep"
            >
              sports
            </Link>
            . For free Broadway stages, read the{' '}
            <Link
              href="/honky-tonk-highway/"
              className="text-clay underline underline-offset-2 hover:text-clay-deep"
            >
              honky-tonk highway
            </Link>{' '}
            guide. When you are ready to place the rest of the trip, open the{' '}
            <Link href="/plan/" className="text-clay underline underline-offset-2 hover:text-clay-deep">
              trip planner
            </Link>{' '}
            or{' '}
            <Link
              href="/where-to-stay/"
              className="text-clay underline underline-offset-2 hover:text-clay-deep"
            >
              where to stay
            </Link>
            .
          </p>
          <p>
            Venue context lives under{' '}
            <Link href="/music/" className="text-clay underline underline-offset-2 hover:text-clay-deep">
              music venues
            </Link>{' '}
            and{' '}
            <Link
              href="/neighborhoods/downtown-broadway/"
              className="text-clay underline underline-offset-2 hover:text-clay-deep"
            >
              Downtown &amp; Broadway
            </Link>
            . Tours and experiences that are not calendar tickets are listed separately on{' '}
            <Link href="/tours/" className="text-clay underline underline-offset-2 hover:text-clay-deep">
              tours
            </Link>
            .
          </p>
        </section>

        {!live && (
          <div className="rounded border border-clay/20 bg-paper-card p-4 text-sm text-clay-deep">
            <strong className="font-semibold">Ticketmaster feed is not live.</strong>{' '}
            {configured
              ? 'Ticketmaster returned no verified Nashville-city events, so clearly labeled fallback records are being used.'
              : 'Add TICKETMASTER_API_KEY in Vercel to replace fallback records.'}
          </div>
        )}
        <Suspense fallback={<LoadingState label="Loading events" />}>
          <EventsClient events={events} />
        </Suspense>
      </div>
    </>
  );
}
