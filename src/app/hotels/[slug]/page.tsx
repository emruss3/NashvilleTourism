import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs, Chip, FactTable, JsonLd, MapLink, PageHeader, SectionHeader } from '@/components/Ui';
import { HotelCard, PhotoSlot } from '@/components/Cards';
import { AffiliateDisclosure, PlacementLabel, VerificationBadge, formatDate } from '@/components/Trust';
import BookingLink from '@/components/BookingLink';
import { hotels, getHotel } from '@/lib/content';
import { neighborhoodName } from '@/lib/content/neighborhoods';
import { partners } from '@/lib/partners';
import { ANALYTICS_EVENTS } from '@/lib/analytics';
import { buildMetadata, hotelSchema, isIndexableRecord } from '@/lib/seo';

export function generateStaticParams() {
  return hotels.map((h) => ({ slug: h.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const h = getHotel(params.slug);
  if (!h) return buildMetadata({ title: 'Not found', description: '', path: '/hotels/', noindex: true });
  return buildMetadata({
    title: h.title,
    description: h.summary,
    path: `/hotels/${h.slug}/`,
    type: 'article',
    modifiedTime: h.dateUpdated || h.dateChecked,
    noindex: !isIndexableRecord(h),
  });
}

export default function HotelPage({ params }: { params: { slug: string } }) {
  const h = getHotel(params.slug);
  if (!h) notFound();

  const hood = neighborhoodName(h.neighborhood);
  const related = h.relatedSlugs.map((s) => getHotel(s)).filter((x): x is NonNullable<typeof x> => Boolean(x));
  const bookingUrl = partners.hotels.build({ area: h.title });

  return (
    <div className="shell pb-16">
      {isIndexableRecord(h) && (
        <JsonLd data={hotelSchema(h, hood, `/hotels/${h.slug}/`)} />
      )}
      <Breadcrumbs
        trail={[
          { name: 'Where to Stay', href: '/where-to-stay/' },
          { name: 'Hotels A–Z', href: '/hotels/' },
          { name: h.title, href: `/hotels/${h.slug}/` },
        ]}
      />

      <PageHeader
        eyebrow={`${hood} · ${h.priceCategory}`}
        title={h.title}
        intro={h.summary}
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <VerificationBadge status={h.dataStatus} date={h.dateChecked} />
            <PlacementLabel placement={h.placement} sponsorName={h.sponsorName} />
          </div>
        }
      />

      {h.placement === 'sponsored' && (
        <div className="mt-6 rounded border border-gold/30 bg-gold-wash p-4 text-sm text-ink-soft">
          <strong className="font-semibold text-gold">Paid partnership.</strong> This listing is a
          paid placement. It is not an editorial recommendation and it does not affect how we rank
          other hotels.{' '}
          <Link href="/advertising/#disclosure" className="underline">
            Our advertising policy
          </Link>
        </div>
      )}

      <div className="grid gap-10 py-10 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <PhotoSlot label={h.title} ratio="aspect-[16/9]" className="rounded-card" />

          <section className="py-8">
            <h2 className="text-2xl">Why we recommend it</h2>
            <div className="prose-editorial mt-3">
              <p>{h.whyWeRecommend}</p>
            </div>
          </section>

          <section className="py-4">
            <h2 className="text-2xl">Best for</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {h.bestFor.map((b) => (
                <Chip key={b}>{b}</Chip>
              ))}
            </div>
          </section>

          <section className="py-6">
            <h2 className="text-2xl">Amenities</h2>
            <ul className="mt-3 grid gap-1.5 text-[15px] text-ink-soft sm:grid-cols-2">
              {h.amenities.map((a) => (
                <li key={a} className="flex gap-2.5">
                  <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-clay" />
                  {a}
                </li>
              ))}
            </ul>
          </section>

          <section className="py-4">
            <h2 className="text-2xl">Getting around</h2>
            <div className="prose-editorial mt-3">
              <p>{h.walkabilityNote}</p>
              <p>
                <strong className="text-ink">Parking.</strong> {h.parkingNote}
              </p>
            </div>
            {h.nearbyAttractions.length > 0 && (
              <>
                <h3 className="mt-6 font-sans text-lg font-bold">Nearby</h3>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {h.nearbyAttractions.map((n) => (
                    <li key={n}>
                      <Chip>{n}</Chip>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <FactTable
            rows={[
              { label: 'Neighborhood', value: <Link href={`/neighborhoods/${h.neighborhood}/`} className="text-clay underline underline-offset-2">{hood}</Link> },
              { label: 'Price category', value: h.priceCategory },
              { label: 'Address', value: h.address },
              { label: 'Pool', value: h.hasPool ? 'Yes' : 'No' },
              { label: 'Fitness centre', value: h.hasFitness ? 'Yes' : 'No' },
              { label: 'Family friendly', value: h.familyFriendly ? 'Yes' : 'Check with the hotel' },
              { label: 'Last checked', value: <time dateTime={h.dateChecked}>{formatDate(h.dateChecked)}</time> },
            ]}
          />

          <div className="space-y-3 rounded-card border border-paper-edge bg-white p-4">
            <BookingLink
              url={bookingUrl}
              label="Check availability"
              name={h.title}
              slug={h.slug}
              event={ANALYTICS_EVENTS.HOTEL_AFFILIATE_CLICKED}
              placement={h.placement === 'editorial' ? 'editorial' : h.placement}
            />
            <MapLink query={h.mapQuery} label="Directions and map" />
          </div>

          {(h.placement === 'affiliate' || h.placement === 'sponsored') && <AffiliateDisclosure />}
        </aside>
      </div>

      {related.length > 0 && (
        <section className="border-t border-paper-edge py-10">
          <SectionHeader title="Related hotels" href="/hotels/" linkLabel="All hotels" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((x) => (
              <HotelCard key={x.slug} item={x} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
