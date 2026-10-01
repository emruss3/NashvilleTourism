import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs, Chip, JsonLd, MapLink, SectionHeader } from '@/components/Ui';
import { HotelCard, PhotoSlot } from '@/components/Cards';
import { PlacementLabel } from '@/components/Trust';
import RoomOptions, { type RoomsPayload } from '@/components/hotels/RoomOptions';
import HotelGallery from '@/components/hotels/HotelGallery';
import HotelBookingBox from '@/components/hotels/HotelBookingBox';
import HotelSectionTabs from '@/components/hotels/HotelSectionTabs';
import GuestReviews from '@/components/hotels/GuestReviews';
import HotelResultsMap from '@/components/hotels/HotelResultsMap';
import { hotels, getHotel } from '@/lib/content';
import { neighborhoodName } from '@/lib/content/neighborhoods';
import { getHotelRates, isHotelsLiveConfigured } from '@/lib/feeds/hotels-live';
import { getHotelReviews, getHotelRooms } from '@/lib/feeds/hotel-rooms';
import { scoreOutOfTen, scoreWord } from '@/lib/hotel-reviews';
import { hotelBookingHref } from '@/lib/hotel-booking';
import { partners } from '@/lib/partners';
import { resolveStayDates } from '@/lib/stay-dates';
import { buildMetadata, hotelSchema, isIndexableRecord } from '@/lib/seo';

// Rendered per request: the room list and the live rate follow the dates
// in the query, and both come from the Postgres rate cache, so a request
// inside the TTL makes no provider call.
export const dynamic = 'force-dynamic';

export async function generateMetadata(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
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

type Query = Record<string, string | string[] | undefined>;
function one(q: Query, key: string): string | undefined {
  const raw = q[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.trim() || undefined;
}

/**
 * Hotel page: photo mosaic across the top, the name with its guest score
 * and stars, a sticky row of section links (Overview, Rooms, Reviews,
 * Location), the sections down the left, and the booking box pinned on the
 * right (and as a bar above the bottom navigation on phones) so Book is
 * always one click away.
 */
export default async function HotelPage(props: { params: Promise<{ slug: string }>; searchParams?: Promise<Query> }) {
  const params = await props.params;
  const query = (await props.searchParams) ?? {};
  const h = getHotel(params.slug);
  if (!h) notFound();

  const hood = neighborhoodName(h.neighborhood);
  const related = h.relatedSlugs.map((s) => getHotel(s)).filter((x): x is NonNullable<typeof x> => Boolean(x));
  const dates = resolveStayDates(one(query, 'checkin'), one(query, 'checkout'));
  const adultsRaw = Number(one(query, 'adults'));
  const adults = Number.isInteger(adultsRaw) && adultsRaw >= 1 && adultsRaw <= 20 ? adultsRaw : 2;
  const liveReady = Boolean(h.liteApiHotelId && partners.stay.host && isHotelsLiveConfigured());
  const [live, rooms, reviewsResult] = liveReady && h.liteApiHotelId
    ? await Promise.all([
        getHotelRates({ hotelIds: [h.liteApiHotelId], checkin: dates.checkin, checkout: dates.checkout, adults, campaign: 'hotels-detail' }),
        getHotelRooms({ hotelId: h.liteApiHotelId, checkin: dates.checkin, checkout: dates.checkout, adults, campaign: 'hotels-detail-rooms' }),
        getHotelReviews(h.liteApiHotelId),
      ])
    : [undefined, undefined, undefined];
  const detail = rooms?.detail;
  const showScore = Boolean((rooms?.canDisplayRating || reviewsResult?.canDisplayRating) && detail?.rating !== undefined && (detail?.reviewCount ?? 0) > 0);
  const reviews = reviewsResult?.canDisplayRating ? reviewsResult.reviews : undefined;
  // The live rate for the stay: the cheapest room in the list, else the "from" rate.
  const cheapest = rooms?.groups[0]?.cheapest;
  const fromRate = live?.live ? live.rates.find((r) => r.hotelId === h.liteApiHotelId) : undefined;
  const rate = cheapest
    ? { nightly: cheapest.nightly, total: cheapest.total, nights: cheapest.nights, refundable: cheapest.refundable, fetchedAt: rooms?.fetchedAt ?? new Date().toISOString() }
    : fromRate
      ? { nightly: fromRate.nightly, total: fromRate.total, nights: fromRate.nights, refundable: fromRate.refundable, fetchedAt: fromRate.fetchedAt }
      : undefined;
  const booking = hotelBookingHref(h, { surface: 'hotel', checkin: dates.checkin, checkout: dates.checkout, adults });
  const testMode = rooms?.environment === 'sandbox' || live?.environment === 'sandbox';
  const roomsInitial: RoomsPayload | undefined = rooms
    ? {
        ok: rooms.live,
        hotelId: rooms.hotelId,
        checkin: dates.checkin,
        checkout: dates.checkout,
        adults,
        cached: rooms.cached,
        environment: rooms.environment,
        fetchedAt: rooms.fetchedAt,
        attribution: rooms.attribution,
        rateCount: rooms.rateCount,
        hotel: rooms.detail ? { name: rooms.detail.name, checkinTime: rooms.detail.checkinTime, checkoutTime: rooms.detail.checkoutTime } : null,
        groups: rooms.groups,
        error: rooms.live ? undefined : 'Rates are not available right now.',
      }
    : undefined;
  const tabs = [
    { id: 'overview', label: 'Overview' },
    ...(liveReady && h.liteApiHotelId ? [{ id: 'rooms', label: 'Rooms' }] : []),
    ...(reviews ? [{ id: 'reviews', label: 'Reviews' }] : []),
    { id: 'location', label: 'Location' },
  ];

  return (
    <div className="shell pb-28 lg:pb-16">
      {isIndexableRecord(h) && <JsonLd data={hotelSchema(h, hood, `/hotels/${h.slug}/`)} />}
      <Breadcrumbs
        trail={[
          { name: 'Where to Stay', href: '/where-to-stay/' },
          { name: 'Hotels A–Z', href: '/hotels/' },
          { name: h.title, href: `/hotels/${h.slug}/` },
        ]}
      />

      <div className="mt-2">
        {detail?.images.length ? <HotelGallery images={detail.images} name={h.title} attribution={rooms?.attribution} /> : <PhotoSlot label={h.title} neighborhood={h.neighborhood} ratio="aspect-[16/9]" className="rounded-card" />}
      </div>

      <header className="pt-6">
        <h1 className="text-[2.25rem] leading-[0.98] sm:text-[3rem]">{h.title}</h1>
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] text-ink-soft">
          {showScore && detail ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="rounded bg-ink px-1.5 py-0.5 text-sm font-bold text-paper">{scoreOutOfTen(detail.rating!).toFixed(1)}</span>
              <span className="font-semibold text-ink">{scoreWord(scoreOutOfTen(detail.rating!))}</span>
              <a href="#reviews" className="underline underline-offset-2">
                {detail.reviewCount!.toLocaleString()} reviews
              </a>
            </span>
          ) : null}
          {detail?.stars ? (
            <span>
              <span aria-hidden="true">{'★'.repeat(Math.round(detail.stars))}</span> {Math.round(detail.stars)}-star hotel
            </span>
          ) : null}
          <Link href={`/neighborhoods/${h.neighborhood}/`} className="underline underline-offset-2">
            {hood}
          </Link>
          <span>{h.priceCategory}</span>
          {h.hasPool ? <Chip>Pool</Chip> : null}
          {h.placement === 'sponsored' ? <PlacementLabel placement={h.placement} sponsorName={h.sponsorName} /> : null}
        </p>
        <p className="mt-3 max-w-prose text-[17px] leading-relaxed text-ink-soft">{h.summary}</p>
      </header>

      {h.placement === 'sponsored' && (
        <div className="mt-6 rounded border border-gold/30 bg-gold-wash p-4 text-sm text-ink-soft">
          <strong className="font-semibold text-gold">Paid partnership.</strong> This listing is a paid placement. It is not an editorial recommendation and it does not affect how we rank other hotels.{' '}
          <Link href="/advertising/#disclosure" className="underline">
            Our advertising policy
          </Link>
        </div>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
        <div className="min-w-0">
          <HotelSectionTabs tabs={tabs} />

          <section id="overview" className="scroll-mt-32 py-8">
            <h2 className="text-2xl">Overview</h2>
            <div className="prose-editorial mt-3">
              <p>
                <strong className="text-ink">Why we recommend it. </strong>
                {h.whyWeRecommend}
              </p>
            </div>
            <h3 className="mt-6 font-sans text-lg font-bold">Best for</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {h.bestFor.map((b) => (
                <Chip key={b}>{b}</Chip>
              ))}
            </div>
            <h3 className="mt-6 font-sans text-lg font-bold">Amenities</h3>
            <ul className="mt-2 grid gap-1.5 text-[15px] text-ink-soft sm:grid-cols-2">
              {h.amenities.map((a) => (
                <li key={a} className="flex gap-2.5">
                  <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-clay" />
                  {a}
                </li>
              ))}
            </ul>
            <dl className="mt-6 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-2xs font-semibold uppercase tracking-[0.14em] text-ink-soft">Pool</dt>
                <dd className="text-ink">{h.hasPool ? 'Yes' : 'No'}</dd>
              </div>
              <div>
                <dt className="text-2xs font-semibold uppercase tracking-[0.14em] text-ink-soft">Fitness center</dt>
                <dd className="text-ink">{h.hasFitness ? 'Yes' : 'No'}</dd>
              </div>
            </dl>
          </section>

          {liveReady && h.liteApiHotelId ? (
            <section id="rooms" className="scroll-mt-32 border-t border-paper-edge py-8">
              <RoomOptions hotelId={h.liteApiHotelId} hotelName={h.title} slug={h.slug} surface="hotel" initial={roomsInitial} initialCheckin={dates.checkin} initialCheckout={dates.checkout} adults={adults} />
            </section>
          ) : null}

          {reviews ? (
            <section id="reviews" className="scroll-mt-32 border-t border-paper-edge py-8">
              <GuestReviews data={reviews} score={showScore ? detail?.rating : undefined} reviewCount={showScore ? detail?.reviewCount : undefined} name={h.title} />
            </section>
          ) : null}

          <section id="location" className="scroll-mt-32 border-t border-paper-edge py-8">
            <h2 className="text-2xl">Location</h2>
            <p className="mt-3 text-[15px] text-ink">
              {h.address} · <MapLink query={h.mapQuery} label="Directions" />
            </p>
            {detail?.lat !== undefined && detail?.lng !== undefined ? (
              <div className="mt-4">
                <HotelResultsMap points={[{ id: h.slug, name: h.title, lat: detail.lat, lng: detail.lng, image: detail.images[0]?.url, pinned: true, pinLabel: h.title, hrefLabel: 'Directions', href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h.mapQuery)}` }]} center={{ lat: detail.lat, lng: detail.lng }} title={`Map of ${h.title}`} legend={false} />
              </div>
            ) : null}
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

        <div className="lg:pt-14">
          <HotelBookingBox name={h.title} slug={h.slug} rate={rate} checkin={dates.checkin} checkout={dates.checkout} adults={adults} link={booking} testMode={testMode && booking.placement === 'whitelabel'} score={showScore ? detail?.rating : undefined} reviewCount={showScore ? detail?.reviewCount : undefined} />
        </div>
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
