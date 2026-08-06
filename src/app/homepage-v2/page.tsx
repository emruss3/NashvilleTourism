import Link from 'next/link';
import BookingWidget from '@/components/BookingWidget';
import NewsletterForm from '@/components/NewsletterForm';
import ExploreGateways from '@/components/home-v2/ExploreGateways';
import HeroV2 from '@/components/home-v2/HeroV2';
import NashvilleThisWeek from '@/components/home-v2/NashvilleThisWeek';
import NeighborhoodSectionV2 from '@/components/home-v2/NeighborhoodSectionV2';
import PlanningStrip from '@/components/home-v2/PlanningStrip';
import { upcomingEvents } from '@/lib/content';
import { site } from '@/lib/site';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Homepage concept',
  description: 'Visual concept for the NASHVILLE homepage. Not the live homepage.',
  path: '/homepage-v2/',
  noindex: true,
});

/**
 * High-fidelity homepage visual concept.
 * Production homepage remains at `/` — do not merge without explicit approval.
 */
export default function HomepageV2Page() {
  const events = upcomingEvents(5);

  return (
    <>
      <HeroV2 />

      {/* Desktop: overlap hero by ~40px. Mobile: stack below without overlap. */}
      <div className="shell relative z-10 mt-6 lg:-mt-10">
        <div className="mx-auto max-w-4xl">
          <BookingWidget variant="hero" />
        </div>
      </div>

      <ExploreGateways />
      <NashvilleThisWeek events={events} />
      <NeighborhoodSectionV2 />
      <PlanningStrip />

      <section className="bg-paper-card pb-16 pt-14">
        <div className="shell">
          <div className="mx-auto max-w-xl text-left sm:text-center">
            <p className="eyebrow mb-2 text-ink">{site.newsletter.name}</p>
            <h2 className="font-sans text-2xl font-bold text-ink">{site.newsletter.promise}</h2>
            <div className="mt-5 text-left">
              <NewsletterForm location="homepage-v2" />
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-paper-edge bg-paper py-6">
        <div className="shell">
          <p className="text-sm text-ink-soft">
            Independently selected. Sponsored placements clearly labeled.{' '}
            <Link href="/how-we-choose/" className="font-semibold text-ink underline-offset-2 hover:text-clay hover:underline">
              How we choose →
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
