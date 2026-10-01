import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs, MapLink } from '@/components/Ui';
import RoomOptions, { type RoomsPayload } from '@/components/hotels/RoomOptions';
import HotelGallery from '@/components/hotels/HotelGallery';
import HotelBookingBox from '@/components/hotels/HotelBookingBox';
import HotelSectionTabs from '@/components/hotels/HotelSectionTabs';
import GuestReviews from '@/components/hotels/GuestReviews';
import HotelResultsMap from '@/components/hotels/HotelResultsMap';
import { hotels } from '@/lib/content';
import { getHotelReviews, getHotelRooms } from '@/lib/feeds/hotel-rooms';
import { isHotelsLiveConfigured } from '@/lib/feeds/hotels-live';
import { hotelSearchPath } from '@/lib/hotel-booking';
import { scoreOutOfTen, scoreWord } from '@/lib/hotel-reviews';
import { partners } from '@/lib/partners';
import { buildMetadata } from '@/lib/seo';
import { resolveStayDates } from '@/lib/stay-dates';
import { STAY_PARTNER, clientReference, stayCheckoutHref, stayHotelHref } from '@/lib/stay-links';

/**
 * A marketplace hotel without an editorial page: provider photos, name,
 * score and stars, section links, the property's own description and
 * facilities, every room and rate, reviews, location, and the booking box
 * pinned on the right. `noindex`, like every marketplace surface.
 */

export const dynamic = 'force-dynamic';

const HOTEL_ID = /^lp[a-z0-9]{3,16}$/;

type Query = Record<string, string | string[] | undefined>;
function one(q: Query, key: string): string | undefined {
  const raw = q[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.trim() || undefined;
}

export async function generateMetadata(props: { params: Promise<{ hotelId: string }> }) {
  const { hotelId } = await props.params;
  return buildMetadata({ title: 'Rooms and rates', description: 'Room options and live rates for a Nashville hotel.', path: `/hotels/stay/${hotelId}/`, canonicalPath: '/hotels/', noindex: true });
}

export default async function StayRoomsPage(props: { params: Promise<{ hotelId: string }>; searchParams?: Promise<Query> }) {
  const { hotelId } = await props.params;
  if (!HOTEL_ID.test(hotelId)) notFound();
  const query = (await props.searchParams) ?? {};
  const editorial = hotels.find((h) => h.liteApiHotelId === hotelId);
  const dates = resolveStayDates(one(query, 'checkin'), one(query, 'checkout'));
  const adultsRaw = Number(one(query, 'adults'));
  const adults = Number.isInteger(adultsRaw) && adultsRaw >= 1 && adultsRaw <= 20 ? adultsRaw : 2;
  const ready = Boolean(partners.stay.host && isHotelsLiveConfigured());
  const [rooms, reviewsResult] = ready ? await Promise.all([getHotelRooms({ hotelId, checkin: dates.checkin, checkout: dates.checkout, adults, campaign: 'hotels-stay-rooms' }), getHotelReviews(hotelId)]) : [undefined, undefined];
  const reviews = reviewsResult?.canDisplayRating ? reviewsResult.reviews : undefined;
  const detail = rooms?.detail;
  // Booking site not configured, unknown hotel id, or the provider down with
  // nothing cached: no page to show, and no partner-branded empty state.
  if (!rooms || (!rooms.live && !detail)) notFound();
  const name = detail?.name ?? 'This hotel';
  const slug = editorial?.slug ?? hotelId;
  const initial: RoomsPayload = {
    ok: rooms.live,
    hotelId,
    checkin: dates.checkin,
    checkout: dates.checkout,
    adults,
    cached: rooms.cached,
    environment: rooms.environment,
    fetchedAt: rooms.fetchedAt,
    attribution: rooms.attribution,
    rateCount: rooms.rateCount,
    hotel: detail ? { name: detail.name, checkinTime: detail.checkinTime, checkoutTime: detail.checkoutTime } : null,
    groups: rooms.groups,
    error: rooms.live ? undefined : 'Rates are not available right now.',
  };
  const showScore = Boolean(rooms.canDisplayRating && detail?.rating !== undefined && (detail?.reviewCount ?? 0) > 0);
  const cheapest = rooms.groups[0]?.cheapest;
  const rate = cheapest ? { nightly: cheapest.nightly, total: cheapest.total, nights: cheapest.nights, refundable: cheapest.refundable, fetchedAt: rooms.fetchedAt } : undefined;
  const reference = clientReference(editorial ? 'hotel' : 'stay', slug);
  // Direct checkout `on`: the box deep-links the cheapest offer's checkout; otherwise the hotel page.
  const url = (cheapest?.offerId ? stayCheckoutHref(cheapest.offerId, { surface: 'box', checkin: dates.checkin, checkout: dates.checkout, adults, clientReference: reference }) : undefined) ?? stayHotelHref(hotelId, { checkin: dates.checkin, checkout: dates.checkout, adults, clientReference: reference });
  const link = { url, partner: STAY_PARTNER, placement: 'whitelabel' as const, clientReference: reference, hotelId };
  const backHref = hotelSearchPath({ checkin: dates.chosen ? dates.checkin : undefined, checkout: dates.chosen ? dates.checkout : undefined, adults: adults !== 2 ? adults : undefined });
  const tabs = [{ id: 'overview', label: 'Overview' }, { id: 'rooms', label: 'Rooms' }, ...(reviews ? [{ id: 'reviews', label: 'Reviews' }] : []), { id: 'location', label: 'Location' }];

  return (
    <div className="shell pb-28 lg:pb-16">
      <Breadcrumbs
        trail={[
          { name: 'Where to Stay', href: '/where-to-stay/' },
          { name: 'Hotels', href: backHref },
          { name, href: `/hotels/stay/${hotelId}/` },
        ]}
      />

      {detail?.images.length ? (
        <div className="mt-2">
          <HotelGallery images={detail.images} name={name} attribution={rooms.attribution} />
        </div>
      ) : null}

      <header className="pt-6">
        <h1 className="text-[2.25rem] leading-[0.98] sm:text-[3rem]">{name}</h1>
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
          {detail?.address ? <span>{detail.address}</span> : null}
        </p>
        {editorial ? (
          <p className="mt-3 text-sm">
            <Link href={`/hotels/${editorial.slug}/`} className="font-semibold text-clay underline underline-offset-2">
              Read why we recommend {editorial.title}
            </Link>
          </p>
        ) : null}
      </header>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
        <div className="min-w-0">
          <HotelSectionTabs tabs={tabs} />

          <section id="overview" className="scroll-mt-32 py-8">
            <h2 className="text-2xl">Overview</h2>
            {detail?.description ? (
              <>
                <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-ink-soft">{detail.description}</p>
                <p className="mt-2 text-2xs text-ink-soft">Description supplied by the property, not written by Nashville.com.</p>
              </>
            ) : (
              <p className="mt-3 text-[15px] text-ink-soft">The property has not supplied a description.</p>
            )}
            {detail?.facilities.length ? (
              <>
                <h3 className="mt-6 font-sans text-lg font-bold">Facilities</h3>
                <ul className="mt-2 grid gap-1.5 text-[15px] text-ink-soft sm:grid-cols-2">
                  {detail.facilities.slice(0, 24).map((f) => (
                    <li key={f} className="flex gap-2.5">
                      <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-clay" />
                      {f}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {detail?.checkinTime || detail?.checkoutTime ? (
              <p className="mt-6 text-sm text-ink-soft">
                {detail.checkinTime ? `Check-in from ${detail.checkinTime}` : ''}
                {detail.checkinTime && detail.checkoutTime ? ' · ' : ''}
                {detail.checkoutTime ? `Check-out by ${detail.checkoutTime}` : ''}
              </p>
            ) : null}
          </section>

          <section id="rooms" className="scroll-mt-32 border-t border-paper-edge py-8">
            <RoomOptions hotelId={hotelId} hotelName={name} slug={slug} surface={editorial ? 'hotel' : 'stay'} initial={initial} initialCheckin={dates.checkin} initialCheckout={dates.checkout} adults={adults} />
          </section>

          {reviews ? (
            <section id="reviews" className="scroll-mt-32 border-t border-paper-edge py-8">
              <GuestReviews data={reviews} score={showScore ? detail?.rating : undefined} reviewCount={showScore ? detail?.reviewCount : undefined} name={name} />
            </section>
          ) : null}

          <section id="location" className="scroll-mt-32 border-t border-paper-edge py-8">
            <h2 className="text-2xl">Location</h2>
            {detail?.address ? (
              <p className="mt-3 text-[15px] text-ink">
                {detail.address} · <MapLink query={`${name}, ${detail.address}`} label="Directions" />
              </p>
            ) : (
              <p className="mt-3 text-[15px] text-ink-soft">Address on the booking site.</p>
            )}
            {detail?.lat !== undefined && detail?.lng !== undefined ? (
              <div className="mt-4">
                <HotelResultsMap points={[{ id: hotelId, name, lat: detail.lat, lng: detail.lng, image: detail.images[0]?.url, pinned: true, pinLabel: name, hrefLabel: 'Directions', href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name}, ${detail.address ?? 'Nashville'}`)}` }]} center={{ lat: detail.lat, lng: detail.lng }} title={`Map of ${name}`} legend={false} />
              </div>
            ) : null}
            <p className="mt-4 text-sm">
              <Link href={backHref} className="font-semibold text-ink underline underline-offset-2">
                Back to all Nashville hotels
              </Link>
            </p>
          </section>
        </div>

        <div className="lg:pt-14">
          <HotelBookingBox name={name} slug={slug} rate={rate} checkin={dates.checkin} checkout={dates.checkout} adults={adults} link={link} testMode={rooms.environment === 'sandbox'} score={showScore ? detail?.rating : undefined} reviewCount={showScore ? detail?.reviewCount : undefined} />
        </div>
      </div>
    </div>
  );
}
