import Link from 'next/link';
import BookingLink from '@/components/BookingLink';
import { ANALYTICS_EVENTS } from '@/lib/analytics';
import type { RankedHotel } from '@/lib/feeds/hotel-marketplace-rank';
import { formatNightly } from '@/lib/feeds/hotels-live';
import { distanceLabel } from '@/lib/geo';
import { clientReference, stayHotelHref } from '@/lib/stay-links';

/**
 * One marketplace result. Provider photo, name and rating are display-only
 * (the surface is noindex); the price always carries its fetch time; the
 * single CTA opens the white-label hotel page with the searched dates. An
 * editorial hotel is badged "Our pick" and also links to our own page.
 */
export default function HotelMarketCard({
  item,
  checkin,
  checkout,
  adults,
  surface,
  editorialSlug,
  canDisplayRating,
  fromLabel,
}: {
  item: RankedHotel;
  checkin: string;
  checkout: string;
  adults?: number;
  surface: string;
  editorialSlug?: string;
  canDisplayRating: boolean;
  /** "from Lower Broadway" */
  fromLabel?: string;
}) {
  const { rate } = item;
  const slug = editorialSlug ?? rate.hotelId;
  const reference = clientReference(surface, slug);
  const href = stayHotelHref(rate.hotelId, { checkin, checkout, adults, clientReference: reference });
  if (!href) return null;
  const fetched = new Date(rate.fetchedAt).toLocaleString('en-US', { timeZone: 'America/Chicago' });
  const showRating = canDisplayRating && rate.rating !== undefined && (rate.reviewCount ?? 0) > 0;
  const ratingOutOf = rate.rating !== undefined && rate.rating > 5 ? 10 : 5;

  return (
    <article className="card flex h-full flex-col overflow-hidden">
      <div className="relative aspect-[3/2] bg-paper-sunk">
        {rate.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={rate.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-ink-soft">No photo supplied</div>
        )}
        {item.pinned ? (
          <span className="absolute left-3 top-3 rounded bg-ink px-2 py-1 text-2xs font-semibold uppercase tracking-[0.14em] text-paper">Our pick</span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="eyebrow">
          {rate.stars ? `${Math.round(rate.stars)}-star` : rate.hotelTypeName ?? 'Stay'}
          {item.distanceKm !== undefined ? ` · ${distanceLabel(item.distanceKm)}${fromLabel ? ` ${fromLabel}` : ''}` : ''}
        </p>
        <h3 className="mt-1 font-sans text-[17px] font-bold leading-snug text-ink">
          {editorialSlug ? (
            <Link href={`/hotels/${editorialSlug}/`} className="underline-offset-[0.2em] hover:underline">
              {rate.name}
            </Link>
          ) : (
            rate.name
          )}
        </h3>
        {showRating ? (
          <p className="mt-1 text-sm text-ink-soft">
            <span className="font-semibold text-ink">{rate.rating!.toFixed(1)}</span>
            <span className="sr-only"> out of {ratingOutOf}</span> · {rate.reviewCount!.toLocaleString()} guest reviews
          </p>
        ) : null}
        <p className="mt-2 text-[15px] text-ink" title={`Rate fetched ${fetched} Nashville time`}>
          <span className="font-semibold">From {formatNightly(rate.nightly)}</span>
          <span className="text-ink-soft"> a night · {formatNightly(rate.total)} for {rate.nights} {rate.nights === 1 ? 'night' : 'nights'}</span>
        </p>
        <p className="mt-0.5 text-2xs text-ink-soft">
          {rate.refundable === 'RFN' ? 'Free cancellation available' : rate.refundable === 'NRFN' ? 'Non-refundable rate shown' : 'Cancellation terms on the booking site'}
          {rate.boardName && !/room only/i.test(rate.boardName) ? ` · ${rate.boardName}` : ''}
        </p>
        <div className="mt-auto pt-4">
          <BookingLink
            url={href}
            label="Check rates"
            name={rate.name}
            slug={slug}
            event={ANALYTICS_EVENTS.HOTEL_AFFILIATE_CLICKED}
            partner="LiteAPI"
            placement="whitelabel"
            clientReference={reference}
            hotelId={rate.hotelId}
            className="min-h-11 w-full"
          />
        </div>
      </div>
    </article>
  );
}
