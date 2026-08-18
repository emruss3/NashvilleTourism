import Link from 'next/link';
import { Breadcrumbs, PageHeader, SectionHeader } from '@/components/Ui';
import HubLead from '@/components/HubLead';
import { AffiliateDisclosure } from '@/components/Trust';
import BookingWidget from '@/components/BookingWidget';
import { TourProductCard } from '@/components/tours/TourProductCard';
import { getToursCatalog, productsForEditorialHint } from '@/lib/feeds/tours';
import { buildMetadata } from '@/lib/seo';

export const revalidate = 3600;

export const metadata = buildMetadata({
  title: 'Nashville Tours & Experiences',
  description:
    'Browse live Nashville tours and experiences — party buses, pedal taverns, whiskey tastings, sightseeing, and music tours — with ratings, prices, and booking through Viator.',
  path: '/tours/',
});

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
    count: 24,
    sort: 'TRAVELER_RATING',
  });

  return (
    <div className="shell pb-16">
      <Breadcrumbs trail={[{ name: 'Tours', href: '/tours/' }]} />

      <PageHeader
        eyebrow="Book an activity"
        title="Nashville Tours & Experiences"
        intro="Live Nashville experience inventory from Viator, kept separate from NashRoam's editorial recommendations so provider listings never masquerade as our picks."
      />
      <HubLead imageKey="hub/tours-lead" />

      <section className="py-6">
        <h2 className="sr-only">Find hotels, tours, or tickets</h2>
        <BookingWidget />
      </section>

      <div className="py-2">
        <AffiliateDisclosure />
      </div>

      <section className="py-6">
        <SectionHeader
          eyebrow={catalog.live ? (catalog.source === 'viator' ? 'Live from Viator' : 'Viator inventory') : 'Experiences'}
          title={q ? `Results for “${q}”` : 'Top-rated Nashville experiences'}
          description={
            catalog.live
              ? `${catalog.attribution}`
              : catalog.configured
                ? `Live Viator production inventory is not available yet${catalog.error ? `: ${catalog.error}` : '.'}`
                : 'This server cannot reach the NashRoam Supabase integration, so live Viator inventory is offline. Concert and ticket listings on Events use Ticketmaster — a separate feed.'
          }
        />

        {catalog.live && catalog.products.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {catalog.products.map((product) => (
              <li key={product.productCode}>
                <TourProductCard product={product} category={product.categories?.[0]} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-card border border-paper-edge bg-paper-card p-6 text-sm leading-relaxed text-ink-soft">
            <p>
              Live Nashville tour inventory is unavailable right now. We are not showing sample tours in
              its place.
            </p>
            {!catalog.configured ? (
              <p className="mt-3">
                Operator note: add <code className="text-ink">SUPABASE_SERVICE_ROLE_KEY</code> to the
                Vercel project (server-only), redeploy, then open{' '}
                <a className="underline hover:text-clay" href="/api/viator-status/">
                  /api/viator-status/
                </a>
                . Viator credentials stay in Supabase.
              </p>
            ) : (
              <p className="mt-3">
                Operator note: the public marketplace requires a Viator production credential stored in
                Supabase as <code className="text-ink">VIATOR_PRODUCTION_API_KEY</code>. Check{' '}
                <a className="underline hover:text-clay" href="/api/viator-status/">
                  /api/viator-status/
                </a>{' '}
                for the production authentication result.
              </p>
            )}
          </div>
        )}
      </section>

      <section className="py-6">
        <SectionHeader
          eyebrow="NashRoam editorial"
          title="Which tour format fits your group"
          description="These format recommendations are ours. Live products, ratings, prices, photos, and booking links come from Viator."
        />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.editorial.map((tour) => {
            const matches = catalog.live
              ? productsForEditorialHint(catalog.products, tour.searchHint, 1)
              : [];
            return (
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
                    {matches[0] ? (
                      <Link
                        href={`/tours/${encodeURIComponent(matches[0].productCode)}/`}
                        className="btn-primary min-h-[44px] w-full text-center"
                      >
                        See a live match
                      </Link>
                    ) : (
                      <Link
                        href={`/tours/?q=${encodeURIComponent(tour.searchHint)}`}
                        className="btn-secondary min-h-[44px] w-full text-center"
                      >
                        Search this format
                      </Link>
                    )}
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
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
