import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AffiliateDisclosure } from '@/components/Trust';
import { Breadcrumbs, MapLink } from '@/components/Ui';
import RoomOptions, { type RoomsPayload } from '@/components/hotels/RoomOptions';
import { hotels } from '@/lib/content';
import { getHotelRooms } from '@/lib/feeds/hotel-rooms';
import { isHotelsLiveConfigured } from '@/lib/feeds/hotels-live';
import { hotelSearchPath } from '@/lib/hotel-booking';
import { partners } from '@/lib/partners';
import { buildMetadata } from '@/lib/seo';
import { resolveStayDates, stayDatesLabel } from '@/lib/stay-dates';

/**
 * Room list for a marketplace hotel that has no editorial page of its own:
 * provider name, photos and facts (display only), then every room and rate
 * for the searched dates with a "Book this room" hand-off to the booking
 * site. `noindex`, like every marketplace surface. Editorial hotels
 * redirect here never: their room list lives on `/hotels/[slug]/#rooms`.
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
  const rooms = ready ? await getHotelRooms({ hotelId, checkin: dates.checkin, checkout: dates.checkout, adults, campaign: 'hotels-stay-rooms' }) : undefined;
  const detail = rooms?.detail;
  // Booking site not configured, unknown hotel id, or the provider down with
  // nothing cached: no page to show, and no partner-branded empty state.
  if (!rooms || (!rooms.live && !detail)) notFound();
  const name = detail?.name ?? 'This hotel';
  const gallery = detail?.images.slice(0, 5) ?? [];
  const initial: RoomsPayload | undefined = rooms
    ? {
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
      }
    : undefined;
  const showRating = Boolean(rooms?.canDisplayRating && detail?.rating !== undefined && (detail?.reviewCount ?? 0) > 0);
  const ratingOutOf = detail?.rating !== undefined && detail.rating > 5 ? 10 : 5;
  const backHref = hotelSearchPath({ checkin: dates.chosen ? dates.checkin : undefined, checkout: dates.chosen ? dates.checkout : undefined, adults: adults !== 2 ? adults : undefined });

  return (
    <div className="shell pb-16">
      <Breadcrumbs
        trail={[
          { name: 'Where to Stay', href: '/where-to-stay/' },
          { name: 'Hotels', href: backHref },
          { name, href: `/hotels/stay/${hotelId}/` },
        ]}
      />

      <header className="py-6">
        <p className="eyebrow">
          {detail?.stars ? `${Math.round(detail.stars)}-star` : 'Stay'} · {stayDatesLabel(dates)} · {adults} {adults === 1 ? 'adult' : 'adults'}
        </p>
        <h1 className="mt-2 text-3xl md:text-4xl">{name}</h1>
        {detail?.address ? <p className="mt-2 text-sm text-ink-soft">{detail.address}</p> : null}
        {showRating && detail ? (
          <p className="mt-1 text-sm text-ink-soft">
            <span className="font-semibold text-ink">{detail.rating!.toFixed(1)}</span>
            <span className="sr-only"> out of {ratingOutOf}</span> · {detail.reviewCount!.toLocaleString()} guest reviews
          </p>
        ) : null}
        {editorial ? (
          <p className="mt-3 text-sm">
            <Link href={`/hotels/${editorial.slug}/`} className="font-semibold text-clay underline underline-offset-2">
              Read why we recommend {editorial.title}
            </Link>
          </p>
        ) : null}
      </header>

      {gallery.length ? (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-5" aria-label={`${name} photos`}>
          {gallery.map((img, i) => (
            <li key={img.url} className={`relative overflow-hidden rounded-card bg-paper-sunk ${i === 0 ? 'col-span-2 aspect-[3/2] sm:col-span-2 sm:row-span-2 sm:aspect-auto' : 'aspect-[3/2]'}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.caption || ''} className="absolute inset-0 h-full w-full object-cover" loading={i === 0 ? 'eager' : 'lazy'} referrerPolicy="no-referrer" />
            </li>
          ))}
        </ul>
      ) : null}

      <div className="grid gap-10 py-10 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <RoomOptions hotelId={hotelId} hotelName={name} slug={editorial?.slug ?? hotelId} surface={editorial ? 'hotel' : 'stay'} initial={initial} initialCheckin={dates.checkin} initialCheckout={dates.checkout} adults={adults} />
        </div>
        <aside className="space-y-5">
          {detail?.description ? (
            <section className="rounded-card border border-paper-edge bg-white p-4">
              <h2 className="font-sans text-lg font-bold">About the property</h2>
              <p className="mt-2 text-sm text-ink-soft">{detail.description}</p>
              <p className="mt-2 text-2xs text-ink-soft">Description supplied by the property, not written by Nashville.com.</p>
            </section>
          ) : null}
          {detail?.facilities.length ? (
            <section className="rounded-card border border-paper-edge bg-white p-4">
              <h2 className="font-sans text-lg font-bold">Facilities</h2>
              <ul className="mt-2 grid gap-1 text-sm text-ink-soft sm:grid-cols-2 lg:grid-cols-1">
                {detail.facilities.slice(0, 16).map((f) => (
                  <li key={f} className="flex gap-2">
                    <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-clay" />
                    {f}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {detail?.address ? <MapLink query={`${name}, ${detail.address}`} label="Directions and map" /> : null}
          <AffiliateDisclosure variant="stay" />
          <p className="text-sm">
            <Link href={backHref} className="text-clay underline underline-offset-2">
              Back to all Nashville hotels
            </Link>
          </p>
        </aside>
      </div>
    </div>
  );
}
