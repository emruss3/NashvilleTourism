import Link from 'next/link';
import DateShortcuts from '@/components/home/DateShortcuts';
import EventList from '@/components/home/EventList';
import RoomsTonight from '@/components/events/RoomsTonight';
import Hero from '@/components/home/Hero';
import NeighborhoodCards from '@/components/home/NeighborhoodCards';
import ShopFeature from '@/components/home/ShopFeature';
import ToursHotels from '@/components/home/ToursHotels';
import TripStarter from '@/components/home/TripStarter';
import NewsletterForm from '@/components/NewsletterForm';
import { TourProductCard } from '@/components/tours/TourProductCard';
import { JsonLd, SectionHeader } from '@/components/Ui';
import { getCalendar } from '@/lib/feeds/calendar';
import { experienceToProductSummary } from '@/lib/feeds/experiences';
import { getToursCatalog } from '@/lib/feeds/tours';
import { attractions } from '@/lib/content';
import { isIndexableRecord, touristDestinationSchema } from '@/lib/seo';
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
    <div className="home">
      <JsonLd
        data={touristDestinationSchema(
          attractions.filter(isIndexableRecord).slice(0, 8).map((a) => ({ name: a.title, url: `/things-to-do/${a.slug}/`, description: a.summary })),
        )}
      />
      <Hero />

      {/*
        DOM order is the mobile order (calendar, shop, neighborhoods). On
        desktop the reference composition puts neighborhoods first; that is
        a CSS order swap of two whole sections, so nothing renders twice.
      */}
      <div className="flex flex-col">
        <NeighborhoodCards className="md:order-1 md:border-t-0" />

        <section className="section md:order-2" aria-labelledby="calendar-title">
          <div className="shell grid gap-8 md:grid-cols-2 md:gap-6 lg:gap-8">
            <div>
              <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
                <h2 id="calendar-title" className="text-[2rem] sm:text-[2.5rem] lg:text-[3.25rem]">
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
              <div className="mt-3">
                <DateShortcuts />
              </div>
              <div className="mt-4">
                {live && events.length > 0 ? <EventList events={events} limit={3} /> : <RoomsTonight />}
              </div>
            </div>
            <ShopFeature />
          </div>
        </section>
      <TripStarter className="md:order-4" />
      <ToursHotels className="md:order-4" />

      <section className="section md:order-5" aria-labelledby="signup-title">
        <div className="shell grid gap-6 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div>
            <h2 id="signup-title" className="text-[2rem] sm:text-[2.5rem] lg:text-[3rem]">
              {site.newsletter.heading}
            </h2>
            <p className="mt-2 max-w-md text-[17px] text-ink-soft">{site.newsletter.promise}</p>
          </div>
          <NewsletterForm location="homepage" />
        </div>
      </section>
      </div>
    </div>
  );
}
