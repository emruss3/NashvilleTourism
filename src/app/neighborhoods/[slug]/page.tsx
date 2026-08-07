import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs, Chip, FactTable, JsonLd, MapLink, PageHeader, SectionHeader } from '@/components/Ui';
import { AttractionCard, HotelCard, RestaurantCard, VenueCard } from '@/components/Cards';
import { SmartImage } from '@/components/Media';
import { NeighborhoodGuide } from '@/components/neighborhood-guide/NeighborhoodGuide';
import { formatDate } from '@/components/Trust';
import {
  neighborhoods,
  getNeighborhood,
  getNeighborhoodGuide,
  restaurants,
  hotels,
  venues,
  attractions,
} from '@/lib/content';
import { getCalendar } from '@/lib/feeds/calendar';
import { buildMetadata, placeSchema } from '@/lib/seo';
import type { ImageKey } from '@/lib/media';

export function generateStaticParams() {
  return neighborhoods.map((n) => ({ slug: n.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const n = getNeighborhood(params.slug);
  if (!n) return buildMetadata({ title: 'Not found', description: '', path: '/neighborhoods/', noindex: true });

  const guide = getNeighborhoodGuide(n.slug);
  if (guide) {
    return buildMetadata({
      title: guide.pageTitle,
      description: guide.intro,
      path: `/neighborhoods/${n.slug}/`,
      type: 'article',
    });
  }

  return buildMetadata({
    title: `${n.name}, Nashville: A Neighborhood Guide`,
    description: n.summary,
    path: `/neighborhoods/${n.slug}/`,
    type: 'article',
  });
}

function isSampleListing(title: string, slug: string) {
  return title.startsWith('[Sample]') || slug.startsWith('sample-');
}

export default async function NeighborhoodPage({ params }: { params: { slug: string } }) {
  const n = getNeighborhood(params.slug);
  if (!n) notFound();

  const guide = getNeighborhoodGuide(n.slug);
  if (guide) {
    const calendar = await getCalendar();
    const venueMatchers = (guide.downtownVenueNames ?? []).map((name) => name.toLowerCase());
    const downtownEvents =
      venueMatchers.length && calendar.live
        ? calendar.events.filter((event) => {
            const venue = event.venue.toLowerCase();
            return venueMatchers.some((name) => venue.includes(name));
          })
        : [];

    return <NeighborhoodGuide neighborhood={n} guide={guide} downtownEvents={downtownEvents} />;
  }

  const localRestaurants = restaurants.filter(
    (r) => r.neighborhood === n.slug && !isSampleListing(r.title, r.slug),
  );
  const localHotels = hotels.filter((h) => h.neighborhood === n.slug && !isSampleListing(h.title, h.slug));
  const localVenues = venues.filter((v) => v.neighborhood === n.slug && !isSampleListing(v.title, v.slug));
  const localAttractions = attractions.filter(
    (a) => a.neighborhood === n.slug && !isSampleListing(a.title, a.slug),
  );

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
          <SmartImage
            imageKey={`neighborhood/${n.slug}` as ImageKey}
            ratio="aspect-[16/9]"
            className="rounded-card"
            sizes="(max-width: 1024px) 100vw, 66vw"
            priority
          />
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
                    <p className="font-sans text-lg font-bold">{step.activity}</p>
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
              { label: 'Avoid if', value: n.avoidIf.join('; ') },
              { label: 'Walkability', value: n.walkability },
              { label: 'Nightlife', value: n.nightlifeLevel },
              { label: 'Noise', value: n.noiseLevel },
              {
                label: 'To Broadway',
                value:
                  typeof n.broadwayMinutes.walk === 'number'
                    ? n.broadwayMinutes.walk === 0
                      ? 'On Broadway'
                      : `~${n.broadwayMinutes.walk} min walk / ${n.broadwayMinutes.drive} min drive`
                    : `~${n.broadwayMinutes.drive} min drive`,
              },
              { label: 'Typical hotel', value: n.typicalHotelPrice },
              { label: 'Landmarks', value: n.landmarks.join(', ') },
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
