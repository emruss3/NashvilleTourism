import Link from 'next/link';
import { Suspense } from 'react';
import { Breadcrumbs, LoadingState, PageHeader, SectionHeader } from '@/components/Ui';
import HubLead from '@/components/HubLead';
import PlannerClient from './PlannerClient';
import { buildMetadata } from '@/lib/seo';
import { TRIP_TYPE_LABELS } from '@/lib/itinerary';
import { neighborhoods, neighborhoodName } from '@/lib/content/neighborhoods';
import type { TripType } from '@/lib/types';

export const metadata = buildMetadata({
  title: 'Nashville Trip Planner',
  description:
    'Build a Nashville itinerary around your dates, trip type, budget, and pace. Day-by-day plans with travel times, booking lead times, and alternatives.',
  path: '/plan/',
});

const TYPE_BLURBS: Partial<Record<TripType, string>> = {
  'first-visit':
    'First trips usually need one walkable music night Downtown, one stronger dinner neighborhood, and a hotel that keeps transit simple. Expect Broadway to take more time than the map suggests.',
  couples:
    'Couples trips work best when dinner reservations and a listening-room show are locked before nightlife. Quieter bases in Germantown, 12 South, or East Nashville often beat a loud Downtown hotel.',
  friends:
    'Friends weekends need a shared home base, one big night Downtown, and daytime plans that do not require the whole group to agree. Book the show or experience first; fill meals around it.',
  bachelor:
    'Bachelor weekends run on group logistics: a hotel near Broadway or Midtown, a daytime activity with a hard start time, and dinner that can seat everyone without a two-hour wait.',
  bachelorette:
    'Bachelorette weekends usually combine a photo-friendly neighborhood, one reservation-heavy dinner, and a Broadway or Gulch night. Lock lodging and the main dinner before the guest list grows.',
  family:
    'Family trips trade walkability for quieter sleeps and earlier dinners. Green Hills, Sylvan Park, and Germantown tend to work better than a room over Lower Broadway.',
  business:
    'Business trips need a reliable Downtown or Gulch hotel, short taxi hops to meetings, and one flexible evening plan that still works if the day runs late.',
  music:
    'Music-focused trips should book ticketed shows and listening rooms first, then place hotels and dinners within a short ride. Use the live calendar before you fix neighborhood choices.',
  food:
    'Food-focused trips prioritize reservation lead times and neighborhood density over Broadway. East Nashville, Germantown, and 12 South usually beat Downtown for dinner quality per night.',
};

const RELATED_LINKS = [
  { href: '/weekend/', label: 'Weekend itinerary' },
  { href: '/where-to-stay/', label: 'Where to stay' },
  { href: '/live-music-tonight/', label: 'Live music calendar' },
  { href: '/events/', label: 'Events' },
  { href: '/neighborhoods/', label: 'Neighborhoods' },
  { href: '/tours/', label: 'Tours & experiences' },
  { href: '/restaurants/', label: 'Restaurants' },
  { href: '/honky-tonk-highway/', label: 'Honky-tonk highway' },
];

export default function PlanPage({
  searchParams,
}: {
  searchParams?: { type?: string };
}) {
  const rawType = searchParams?.type;
  const tripType =
    rawType && rawType in TRIP_TYPE_LABELS ? (rawType as TripType) : undefined;
  const typeLabel = tripType ? TRIP_TYPE_LABELS[tripType] : null;
  const typeBlurb = tripType ? TYPE_BLURBS[tripType] : null;

  return (
    <div className="shell pb-16">
      <Breadcrumbs trail={[{ name: 'Trip Planner', href: '/plan/' }]} />
      <PageHeader
        eyebrow="Trip planner"
        title={typeLabel ? `Plan a ${typeLabel.toLowerCase()} in Nashville` : 'Plan your Nashville trip'}
        intro="Answer a few questions and we will assemble a day-by-day plan from our published listings, with travel time between stops and how far ahead to book."
      />
      <HubLead imageKey="hub/plan-lead" />

      <section className="max-w-3xl space-y-4 py-8 text-[15px] leading-relaxed text-ink-soft">
        {typeBlurb ? (
          <p>{typeBlurb}</p>
        ) : (
          <p>
            Start with dates, trip type, and pace. The planner builds a day-by-day outline from
            published neighborhoods, restaurants, music, and experiences—not demo businesses—so you
            can see travel time between stops and where reservations matter most.
          </p>
        )}
        <p>
          Before you lock lodging, skim{' '}
          <Link href="/where-to-stay/" className="text-clay underline underline-offset-2 hover:text-clay-deep">
            where to stay
          </Link>{' '}
          and the neighborhood guides for{' '}
          <Link
            href="/neighborhoods/downtown-broadway/"
            className="text-clay underline underline-offset-2 hover:text-clay-deep"
          >
            Downtown &amp; Broadway
          </Link>
          ,{' '}
          <Link
            href="/neighborhoods/the-gulch/"
            className="text-clay underline underline-offset-2 hover:text-clay-deep"
          >
            the Gulch
          </Link>
          , and{' '}
          <Link
            href="/neighborhoods/east-nashville/"
            className="text-clay underline underline-offset-2 hover:text-clay-deep"
          >
            East Nashville
          </Link>
          . For shows, check{' '}
          <Link
            href="/live-music-tonight/"
            className="text-clay underline underline-offset-2 hover:text-clay-deep"
          >
            live music tonight
          </Link>{' '}
          and the wider{' '}
          <Link href="/events/" className="text-clay underline underline-offset-2 hover:text-clay-deep">
            events calendar
          </Link>
          .
        </p>
      </section>

      <div className="py-6">
        <Suspense fallback={<LoadingState label="Loading the planner" />}>
          <PlannerClient />
        </Suspense>
      </div>

      <section className="border-t border-paper-edge py-10">
        <SectionHeader
          title="Trip types"
          description="Open the planner with a trip type already selected."
        />
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(TRIP_TYPE_LABELS) as TripType[]).map((type) => (
            <li key={type}>
              <Link
                href={`/plan/?type=${type}`}
                className="block rounded-card border border-paper-edge bg-white px-4 py-3 text-sm font-medium text-ink transition-colors hover:border-clay hover:text-clay"
              >
                {TRIP_TYPE_LABELS[type]}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="py-8">
        <SectionHeader title="Useful next stops" />
        <ul className="mt-4 flex flex-wrap gap-2">
          {RELATED_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="inline-flex rounded-full border border-paper-edge bg-white px-4 py-1.5 text-sm text-ink-soft transition-colors hover:border-clay hover:text-clay"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-6 max-w-3xl text-[15px] leading-relaxed text-ink-soft">
          Neighborhood context for every base:{' '}
          {neighborhoods
            .slice(0, 8)
            .map((n, i) => (
              <span key={n.slug}>
                {i > 0 ? ', ' : ''}
                <Link
                  href={`/neighborhoods/${n.slug}/`}
                  className="text-clay underline underline-offset-2 hover:text-clay-deep"
                >
                  {neighborhoodName(n.slug)}
                </Link>
              </span>
            ))}
          .
        </p>
      </section>
    </div>
  );
}
