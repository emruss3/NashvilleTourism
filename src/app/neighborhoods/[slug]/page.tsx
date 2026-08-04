import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs, Chip, FactTable, JsonLd, MapLink, PageHeader, SectionHeader } from '@/components/Ui';
import { AttractionCard, HotelCard, PhotoSlot, RestaurantCard, VenueCard } from '@/components/Cards';
import { formatDate } from '@/components/Trust';
import {
  neighborhoods,
  getNeighborhood,
  restaurants,
  hotels,
  venues,
  attractions,
} from '@/lib/content';
import { buildMetadata, placeSchema } from '@/lib/seo';

export function generateStaticParams() {
  return neighborhoods.map((n) => ({ slug: n.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const n = getNeighborhood(params.slug);
  if (!n) return buildMetadata({ title: 'Not found', description: '', path: '/neighborhoods/', noindex: true });
  return buildMetadata({
    title: `${n.name}, Nashville: A Neighborhood Guide`,
    description: n.summary,
    path: `/neighborhoods/${n.slug}/`,
    type: 'article',
  });
}

export default function NeighborhoodPage({ params }: { params: { slug: string } }) {
  const n = getNeighborhood(params.slug);
  if (!n) notFound();

  const localRestaurants = restaurants.filter((r) => r.neighborhood === n.slug);
  const localHotels = hotels.filter((h) => h.neighborhood === n.slug);
  const localVenues = venues.filter((v) => v.neighborhood === n.slug);
  const localAttractions = attractions.filter((a) => a.neighborhood === n.slug);

  return (
    <div className="shell pb-16">
      <JsonLd data={placeSchema(n, `/neighborhoods/${n.slug}/`)} />
      <Breadcrumbs
        trail={[
          { name: 'Neighborhoods', href: '/neighborhoods/' },
          { name: n.name, href: `/neighborhoods/${n.slug}/` },
        ]}
      />
      <PageHeader eyebrow="Neighborhood guide" title={n.name} intro={n.summary} />

      <div className="grid gap-10 py-10 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <PhotoSlot label={n.name} ratio="aspect-[16/9]" className="rounded-card" />
          <section className="py-8">
            <h2 className="text-2xl">The overview</h2>
            <div className="prose-editorial mt-3">
              {n.overview.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>
          <section className="py-2">
            <h2 className="text-2xl">A half day here</h2>
            <ol className="mt-4 space-y-4">
              {n.halfDayItinerary.map((step) => (
                <li key={step.time} className="flex gap-4 border-l-2 border-paper-edge pl-4">
                  <div>
                    <p className="eyebrow">{step.time}</p>
                    <p className="font-display text-lg">{step.activity}</p>
                    <p className="text-[15px] text-ink-soft">{step.note}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-5">
          <FactTable
            rows={[
              { label: 'Best for', value: n.bestFor.join(', ') },
              { label: 'Known for', value: n.knownFor.join(', ') },
              { label: 'Getting there', value: n.gettingThere },
              { label: 'Parking', value: n.parkingNote },
              { label: 'Last checked', value: <time dateTime={n.dateChecked}>{formatDate(n.dateChecked)}</time> },
            ]}
          />
          <div className="rounded-card border border-paper-edge bg-white p-4">
            <MapLink query={n.mapQuery} label={`Map of ${n.name}`} />
          </div>
          <div className="rounded-card border border-paper-edge bg-white p-4">
            <p className="eyebrow mb-2">Known for</p>
            <div className="flex flex-wrap gap-2">
              {n.knownFor.map((k) => (
                <Chip key={k}>{k}</Chip>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {localRestaurants.length > 0 && (
        <section className="border-t border-paper-edge py-10">
          <SectionHeader title={`Restaurants in ${n.name}`} href="/restaurants/" linkLabel="All restaurants" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {localRestaurants.map((r) => (
              <RestaurantCard key={r.slug} item={r} />
            ))}
          </div>
        </section>
      )}

      {localHotels.length > 0 && (
        <section className="border-t border-paper-edge py-10">
          <SectionHeader title={`Hotels in ${n.name}`} href="/hotels/" linkLabel="All hotels" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {localHotels.map((h) => (
              <HotelCard key={h.slug} item={h} />
            ))}
          </div>
        </section>
      )}

      {localVenues.length > 0 && (
        <section className="border-t border-paper-edge py-10">
          <SectionHeader title={`Music in ${n.name}`} href="/music/" linkLabel="All venues" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {localVenues.map((v) => (
              <VenueCard key={v.slug} item={v} />
            ))}
          </div>
        </section>
      )}

      {localAttractions.length > 0 && (
        <section className="border-t border-paper-edge py-10">
          <SectionHeader title={`Things to do in ${n.name}`} href="/things-to-do/" linkLabel="All attractions" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {localAttractions.map((a) => (
              <AttractionCard key={a.slug} item={a} />
            ))}
          </div>
        </section>
      )}

      <section className="border-t border-paper-edge py-10">
        <SectionHeader title="Other neighborhoods" href="/neighborhoods/" linkLabel="See all" />
        <div className="flex flex-wrap gap-2">
          {neighborhoods
            .filter((x) => x.slug !== n.slug)
            .map((x) => (
              <Link
                key={x.slug}
                href={`/neighborhoods/${x.slug}/`}
                className="rounded-full border border-paper-edge bg-white px-4 py-1.5 text-sm text-ink-soft transition-colors hover:border-clay hover:text-clay"
              >
                {x.name}
              </Link>
            ))}
        </div>
      </section>
    </div>
  );
}
