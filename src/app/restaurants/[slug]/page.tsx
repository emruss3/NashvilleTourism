import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs, FactTable, JsonLd, MapLink, PageHeader, SectionHeader, Chip } from '@/components/Ui';
import { PhotoSlot, RestaurantCard } from '@/components/Cards';
import { AffiliateDisclosure, PlacementLabel, VerificationBadge, formatDate } from '@/components/Trust';
import ReservationLink from '@/components/ReservationLink';
import { restaurants, getRestaurant } from '@/lib/content';
import { neighborhoodName } from '@/lib/content/neighborhoods';
import { buildMetadata, restaurantSchema } from '@/lib/seo';

export function generateStaticParams() {
  return restaurants.map((r) => ({ slug: r.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const r = getRestaurant(params.slug);
  if (!r) return buildMetadata({ title: 'Not found', description: '', path: '/restaurants/', noindex: true });
  return buildMetadata({
    title: r.title,
    description: r.summary,
    path: `/restaurants/${r.slug}/`,
    type: 'article',
    modifiedTime: r.dateUpdated || r.dateChecked,
  });
}

export default function RestaurantPage({ params }: { params: { slug: string } }) {
  const r = getRestaurant(params.slug);
  if (!r) notFound();

  const hood = neighborhoodName(r.neighborhood);
  const related = r.relatedSlugs
    .map((s) => getRestaurant(s))
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  return (
    <div className="shell pb-16">
      <JsonLd data={restaurantSchema(r, hood, `/restaurants/${r.slug}/`)} />
      <Breadcrumbs
        trail={[
          { name: 'Restaurants', href: '/restaurants/' },
          { name: r.title, href: `/restaurants/${r.slug}/` },
        ]}
      />

      <PageHeader
        eyebrow={`${hood} · ${r.cuisine}`}
        title={r.title}
        intro={r.summary}
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <VerificationBadge status={r.dataStatus} date={r.dateChecked} />
            <PlacementLabel placement={r.placement} sponsorName={r.sponsorName} />
          </div>
        }
      />

      <div className="grid gap-10 py-10 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <PhotoSlot label={r.title} ratio="aspect-[16/9]" className="rounded-card" />

          <section className="py-8">
            <h2 className="text-2xl">Why we recommend it</h2>
            <div className="prose-editorial mt-3">
              <p>{r.whyWeRecommend}</p>
            </div>
          </section>

          <section className="py-4">
            <h2 className="text-2xl">Good to know</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {r.bestFor.map((b) => (
                <Chip key={b}>{b}</Chip>
              ))}
              {r.goodForGroups && <Chip>Good for groups</Chip>}
              {r.outdoorSeating && <Chip>Outdoor seating</Chip>}
            </div>
            <div className="prose-editorial mt-4">
              <p>
                <strong className="text-ink">Parking.</strong> {r.parkingNote}
              </p>
              <p>
                <strong className="text-ink">Dress code.</strong> {r.dressCode}
              </p>
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <FactTable
            rows={[
              { label: 'Neighborhood', value: <Link href={`/neighborhoods/${r.neighborhood}/`} className="text-clay underline underline-offset-2">{hood}</Link> },
              { label: 'Cuisine', value: r.cuisine },
              { label: 'Price', value: r.priceRange },
              { label: 'Address', value: r.address },
              { label: 'Hours', value: r.hoursNote },
              { label: 'Reservations', value: r.reservationPlatform || 'Check with the restaurant' },
              { label: 'Last checked', value: <time dateTime={r.dateChecked}>{formatDate(r.dateChecked)}</time> },
            ]}
          />

          <div className="space-y-3 rounded-card border border-paper-edge bg-white p-4">
            <ReservationLink
              url={r.reservationUrl}
              name={r.title}
              slug={r.slug}
              platform={r.reservationPlatform}
            />
            <MapLink query={r.mapQuery} label="Directions and map" />
          </div>

          {r.placement === 'affiliate' && <AffiliateDisclosure />}

          <div className="rounded-card border border-paper-edge bg-paper-sunk p-4 text-sm text-ink-soft">
            <p>
              Hours and details change. If something here is wrong,{' '}
              <Link href="/corrections/" className="text-clay underline underline-offset-2">
                tell us
              </Link>{' '}
              and we will check it.
            </p>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="border-t border-paper-edge py-10">
          <SectionHeader title="Related restaurants" href="/restaurants/" linkLabel="All restaurants" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((x) => (
              <RestaurantCard key={x.slug} item={x} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
