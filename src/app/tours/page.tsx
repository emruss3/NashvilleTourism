import Link from 'next/link';
import { Breadcrumbs, PageHeader, SectionHeader } from '@/components/Ui';
import HubLead from '@/components/HubLead';
import { AffiliateDisclosure } from '@/components/Trust';
import BookingWidget from '@/components/BookingWidget';
import { TourProductCard } from '@/components/tours/TourProductCard';
import { getToursCatalog } from '@/lib/feeds/tours';
import { buildMetadata } from '@/lib/seo';

export const revalidate = 3600;

export const metadata = buildMetadata({
  title: 'Nashville Tours & Experiences',
  description:
    'Browse live Nashville tours and experiences — party buses, food tours, whiskey tastings, sightseeing, music tours, and more — with ratings, starting prices, and booking through Viator.',
  path: '/tours/',
});

const QUICK_SEARCHES = [
  'Party bus',
  'Pub crawl',
  'Whiskey distillery',
  'Food tour',
  'City sightseeing',
  'Music history',
  'Bike tour',
  'Boat tour',
] as const;

export default async function ToursHub({
  searchParams,
}: {
  searchParams?: { q?: string; date?: string };
}) {
  const q = searchParams?.q?.trim() || undefined;
  const date = searchParams?.date?.trim() || undefined;
  const catalog = await getToursCatalog({
    query: q,
    startDate: date,
    endDate: date,
    count: 24,
    sort: 'TRAVELER_RATING',
  });
  const hasResults = catalog.live && catalog.products.length > 0;
  const liveNoResults = catalog.live && catalog.products.length === 0;

  return (
    <div className="shell pb-16">
      <Breadcrumbs trail={[{ name: 'Tours', href: '/tours/' }]} />

      <PageHeader
        eyebrow="Book an activity"
        title="Nashville Tours & Experiences"
        intro="Search live Viator inventory from NashRoam, compare ratings and starting prices, then confirm the exact date, party size, price, and checkout on Viator."
      />
      <HubLead imageKey="hub/tours-lead" />

      <section className="py-6">
        <h2 className="sr-only">Search Nashville tours and experiences</h2>
        <BookingWidget defaultTab="tours" />
      </section>

      <nav aria-label="Popular tour searches" className="flex flex-wrap gap-2 pb-4">
        {QUICK_SEARCHES.map((label) => (
          <Link
            key={label}
            href={`/tours/?q=${encodeURIComponent(label)}`}
            className="rounded-full border border-paper-edge bg-paper-card px-3.5 py-2 text-sm font-semibold text-ink-soft transition hover:border-clay hover:text-clay"
          >
            {label}
          </Link>
        ))}
        {(q || date) && (
          <Link
            href="/tours/"
            className="rounded-full border border-paper-edge px-3.5 py-2 text-sm font-semibold text-clay hover:bg-paper-card"
          >
            Clear filters
          </Link>
        )}
      </nav>

      <div className="py-2">
        <AffiliateDisclosure />
      </div>

      <section className="py-6">
        <SectionHeader
          eyebrow={catalog.live ? 'Live from Viator' : 'Experiences'}
          title={q ? `Results for “${q}”` : date ? `Experiences for ${date}` : 'Top-rated Nashville experiences'}
          description={
            hasResults
              ? `${catalog.products.length} live matches shown. ${catalog.attribution}`
              : liveNoResults
                ? 'Viator is connected, but no current Nashville products matched these filters. Try a broader search or clear the date.'
                : 'Live Viator inventory is temporarily unavailable. Please try again shortly.'
          }
        />

        {hasResults ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {catalog.products.map((product) => (
              <li key={product.productCode}>
                <TourProductCard product={product} category={product.categories?.[0]} />
              </li>
            ))}
          </ul>
        ) : liveNoResults ? (
          <div className="rounded-card border border-paper-edge bg-paper-card p-6 text-sm leading-relaxed text-ink-soft">
            <p className="font-semibold text-ink">No matching live experiences found.</p>
            <p className="mt-2">
              Viator is online. Try a shorter phrase such as “party bus,” “food tour,” “whiskey,” or “sightseeing,” or remove the date filter.
            </p>
            <Link href="/tours/" className="btn-secondary mt-5 inline-flex min-h-[44px]">
              Show all Nashville experiences
            </Link>
          </div>
        ) : (
          <div className="rounded-card border border-paper-edge bg-paper-card p-6 text-sm leading-relaxed text-ink-soft">
            <p className="font-semibold text-ink">Live tour inventory is temporarily unavailable.</p>
            <p className="mt-2">Please try again in a few minutes. We do not substitute sample products when the provider feed is offline.</p>
          </div>
        )}
      </section>

      <section className="py-6">
        <SectionHeader
          eyebrow="NashRoam guide"
          title="Choose the right tour format"
          description="These planning notes are NashRoam editorial guidance. Use each link to run a fresh search against live Viator inventory rather than forcing an unrelated product match."
        />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.editorial.map((tour) => (
            <li key={tour.slug}>
              <article className="card flex h-full flex-col p-5">
                <h3 className="font-sans text-lg font-bold leading-snug">{tour.name}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{tour.what}</p>
                <dl className="mt-4 space-y-2 border-t border-paper-edge pt-4 text-sm">
                  <div className="grid grid-cols-[6.5rem_1fr] gap-3">
                    <dt className="font-semibold text-ink">Group size</dt>
                    <dd className="text-ink-soft">{tour.groupSize}</dd>
                  </div>
                  <div className="grid grid-cols-[6.5rem_1fr] gap-3">
                    <dt className="font-semibold text-ink">Plan for</dt>
                    <dd className="text-ink-soft">{tour.priceGuidance}</dd>
                  </div>
                  <div className="grid grid-cols-[6.5rem_1fr] gap-3">
                    <dt className="font-semibold text-ink">Best for</dt>
                    <dd className="text-ink-soft">{tour.bestFor}</dd>
                  </div>
                  <div className="grid grid-cols-[6.5rem_1fr] gap-3">
                    <dt className="font-semibold text-ink">Watch out</dt>
                    <dd className="text-ink-soft">{tour.watchOut}</dd>
                  </div>
                </dl>
                <div className="mt-auto pt-5">
                  <Link
                    href={`/tours/?q=${encodeURIComponent(tour.searchHint)}`}
                    className="btn-primary min-h-[44px] w-full text-center"
                  >
                    Browse live options
                  </Link>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </section>

      <section className="py-6">
        <h2 className="text-2xl sm:text-[28px]">Before you book</h2>
        <ul className="mt-4 max-w-prose space-y-3">
          {[
            'The price shown on NashRoam is Viator’s starting price. Some products price by person, while private boats, vehicles, or charters may price by the unit or group.',
            'A date filter narrows Viator’s product search. Exact start times, party-size pricing, and final availability are confirmed on Viator before checkout.',
            'Read the cancellation terms on the product page before you pay. Free cancellation is common but not universal.',
            'For private tours and charters, compare the total vehicle or group price rather than assuming the displayed starting price is a per-person rate.',
          ].map((note) => (
            <li key={note} className="flex gap-3 text-[15px] leading-relaxed text-ink-soft">
              <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-clay" />
              <span>{note}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 max-w-prose text-sm text-ink-faint">{catalog.attribution}</p>
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
