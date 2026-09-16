import Link from 'next/link';
import EventList from '@/components/home/EventList';
import Hero from '@/components/home/Hero';
import NeighborhoodCards from '@/components/home/NeighborhoodCards';
import ShopFeature from '@/components/home/ShopFeature';
import TripStarter from '@/components/home/TripStarter';
import NewsletterForm from '@/components/NewsletterForm';
import { TourProductCard } from '@/components/tours/TourProductCard';
import { SectionHeader } from '@/components/Ui';
import { getCalendar } from '@/lib/feeds/calendar';
import { experienceToProductSummary } from '@/lib/feeds/experiences';
import { getToursCatalog } from '@/lib/feeds/tours';
import { site } from '@/lib/site';
import { assertHomepageMediaIntegrity } from '@/lib/assert-homepage-media';

assertHomepageMediaIntegrity();

/** Live event and tour rows refresh on the same cadence as the calendar pages. */
export const revalidate = 1800;

/**
 * Homepage in the MOBILE-FIRST.md order: header, introduction, search,
 * photograph, calendar, shop, neighborhoods, trip starter, newsletter, footer.
 * Each module renders once; desktop groups the calendar and shop into one
 * two-column region and widens the rest.
 */
export default async function HomePage() {
  const [{ events, live }, tours] = await Promise.all([getCalendar(), getToursCatalog({ count: 3 })]);
  const featuredExperiences = tours.live ? tours.experiences.slice(0, 3) : [];

  return (
    <>
      <Hero />

      <section className="section" aria-labelledby="calendar-title">
        <div className="shell grid gap-10 md:grid-cols-2 md:gap-8 lg:gap-12">
          <div>
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
              <h2 id="calendar-title" className="text-[2.25rem] sm:text-[2.75rem]">
                On the calendar.
              </h2>
              <Link
                href="/events/"
                className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-sm font-semibold text-ink underline-offset-[0.2em] hover:underline"
              >
                See all events
                <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div className="mt-4">
              {live && events.length > 0 ? (
                <EventList events={events} limit={3} />
              ) : (
                <div className="rounded-card border border-paper-edge p-5 sm:p-6">
                  <p className="text-[17px] font-semibold text-ink">The live calendar is on its way.</p>
                  <p className="mt-2 max-w-prose text-[15px] text-ink-soft">
                    We are connecting current ticketed shows at Nashville venues. Until then, the venue
                    guides and the honky-tonk highway cover what is on most nights.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link href="/music/" className="btn-primary">
                      Browse venues
                    </Link>
                    <Link href="/honky-tonk-highway/" className="btn-secondary">
                      Honky-tonk highway
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
          <ShopFeature />
        </div>
      </section>

      <NeighborhoodCards />

      {featuredExperiences.length > 0 ? (
        <section className="section border-t border-paper-edge">
          <div className="shell">
            <SectionHeader
              title="Book a Nashville experience"
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

      <TripStarter />

      <section className="py-12 lg:py-16" aria-labelledby="signup-title">
        <div className="shell grid gap-6 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div>
            <h2 id="signup-title" className="text-[2.25rem]">
              {site.newsletter.heading}
            </h2>
            <p className="mt-2 max-w-md text-[17px] text-ink-soft">{site.newsletter.promise}</p>
          </div>
          <NewsletterForm location="homepage" />
        </div>
      </section>
    </>
  );
}
