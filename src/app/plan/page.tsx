import Link from 'next/link';
import { Suspense } from 'react';
import { SmartImage } from '@/components/Media';
import { Breadcrumbs, JsonLd, LoadingState } from '@/components/Ui';
import PageIntro, { MediaPair } from '@/components/hub/PageIntro';
import SectionHead from '@/components/hub/SectionHead';
import { OCCASIONS, occasionFromType } from '@/lib/group-planner';
import { buildMetadata, serviceSchema } from '@/lib/seo';
import { site } from '@/lib/site';
import PlannerClient from './PlannerClient';

export const metadata = buildMetadata({
  title: 'Nashville Trip Planner',
  description:
    'Tell us who is coming and we build the trip around the group: occasion, headcount, ages, dates and budget shape a day-by-day Nashville plan from real places, with the checks still outstanding spelled out.',
  path: '/plan/',
});

const OCCASION_BLURBS: Record<string, string> = {
  bachelorette:
    'Bachelorette weekends usually combine a photo-friendly neighborhood, one reservation-heavy dinner, and a Broadway or Gulch night. Lock lodging and the main dinner before the guest list grows.',
  bachelor:
    'Bachelor weekends run on group logistics: a hotel near Broadway or Midtown, a daytime activity with a hard start time, and dinner that can seat everyone without a two-hour wait.',
  friends:
    'Friends weekends need a shared home base, one big night Downtown, and daytime plans that do not require the whole group to agree. Book the show or experience first; fill meals around it.',
  family:
    'Family trips trade walkability for quieter sleeps and earlier dinners. Green Hills, Sylvan Park and Germantown tend to work better than a room over Lower Broadway.',
  couples:
    'Couples trips work best when dinner reservations and a listening-room show are locked before nightlife. Quieter bases in Germantown, 12 South or East Nashville often beat a loud Downtown hotel.',
  corporate:
    'Retreats keep the meeting blocks fixed and put the group within a short walk of a reliable Downtown or Gulch hotel, with one dinner that can seat everyone and an evening that still works if the day runs late.',
};

const RELATED_LINKS = [
  { href: '/weekend/', label: 'Weekend itinerary' },
  { href: '/hotels/', label: 'Hotels' },
  { href: '/events/', label: 'Events' },
  { href: '/neighborhoods/', label: 'Neighborhoods' },
  { href: '/tours/', label: 'Tours & experiences' },
  { href: '/restaurants/', label: 'Restaurants' },
  { href: '/things-to-do/', label: 'Things to do' },
];

/**
 * Plan your trip: a group-optimized planner (page-designs/README.md §08,
 * GROUP-TRIP-PLANNER.md). A short editorial introduction, then the group
 * form. On phones the form comes before any photograph.
 */
export default async function PlanPage(props: { searchParams?: Promise<{ occasion?: string; type?: string }> }) {
  const searchParams = await props.searchParams;
  const occasion = occasionFromType(searchParams?.occasion ?? searchParams?.type);
  const blurb = occasion ? OCCASION_BLURBS[occasion] : undefined;

  return (
    <>
      <div className="shell">
        <JsonLd
          data={serviceSchema({
            path: '/plan/',
            name: 'Nashville group trip planner',
            serviceType: 'Travel planning',
            description: 'Tell NSVL who is coming and when, and it builds a Nashville plan around the group: shows, tables and places that fit, with nothing booked on your behalf.',
            audience: 'Visitors planning a Nashville trip',
            offers: { price: '0' },
          })}
        />
        <Breadcrumbs trail={[{ name: 'Plan your trip', href: '/plan/' }]} />
      </div>

      <PageIntro
        eyebrow="Plan together"
        title={site.brandIdea}
        support="Tell us who is coming. We’ll build the trip around you."
        media={
          <MediaPair
            className="hidden lg:grid"
            primary={<SmartImage imageKey="hub/trip-planner-premium" ratio="aspect-[4/3] lg:aspect-auto lg:h-[400px]" sizes="40vw" priority />}
            secondary={<SmartImage imageKey="concept/group-toast" ratio="aspect-[3/4] lg:aspect-auto lg:h-[400px]" sizes="25vw" priority />}
          />
        }
      >
        <p className="hidden text-[15px] text-ink-soft lg:block">
          Different groups, one good plan. Tell us about your crew and we build a day-by-day draft from real places, with the right mix of music, food, experiences and local favorites.
        </p>
      </PageIntro>

      <div className="shell pb-10">
        <div className="rounded-card border border-paper-edge bg-paper-sunk p-5 lg:p-8">
          <Suspense fallback={<LoadingState label="Loading the planner" />}>
            <PlannerClient />
          </Suspense>
        </div>
        {blurb ? <p className="mt-6 max-w-3xl text-[15px] leading-relaxed text-ink-soft">{blurb}</p> : null}
      </div>

      <section className="border-t border-paper-edge" aria-labelledby="groups-title">
        <div className="shell section">
          <SectionHead id="groups-title" eyebrow="Start with your group" title="Who is coming?" size="md" support="Open the planner with the occasion already chosen. Follow-up questions change with it." />
          <ul className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
            {OCCASIONS.map((o) => (
              <li key={o.value}>
                <Link href={`/plan/?occasion=${o.value}`} className="card flex min-h-12 flex-col justify-center px-4 py-3 text-[15px] font-semibold">
                  {o.label}
                  <span className="mt-0.5 text-2xs font-normal text-ink-soft">{o.hint}</span>
                </Link>
              </li>
            ))}
          </ul>
          <ul className="mt-8 flex flex-wrap gap-2">
            {RELATED_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="inline-flex min-h-11 items-center rounded border border-paper-edge px-4 text-[15px] font-semibold text-ink hover:border-ink">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
