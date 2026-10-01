'use client';

import { AffiliateDisclosure } from '@/components/Trust';
import TestModeNotice from '@/components/hotels/TestModeNotice';
import { ANALYTICS_EVENTS, track } from '@/lib/analytics';
import { formatNightly, type LiveMoney } from '@/lib/feeds/hotels-live';
import { scoreOutOfTen, scoreWord } from '@/lib/hotel-reviews';

export interface BookingBoxRate {
  nightly: LiveMoney;
  total: LiveMoney;
  nights: number;
  refundable?: 'RFN' | 'NRFN';
  fetchedAt: string;
}

export interface BookingBoxLink {
  url?: string;
  partner: string;
  placement: 'whitelabel' | 'affiliate';
  clientReference: string;
  hotelId?: string;
}

function dayLabel(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));
}

/**
 * The booking box: the live rate for the chosen stay, the dates and party,
 * and one Book button. On wide screens it sticks to the right while the
 * page scrolls; under the tablet width it also repeats as a fixed bar above
 * the bottom navigation, so the button is always one tap away. The button
 * opens our booking site on this hotel with the same dates; nothing is
 * booked or held here.
 */
export default function HotelBookingBox({
  name,
  slug,
  rate,
  checkin,
  checkout,
  adults,
  link,
  testMode = false,
  score,
  reviewCount,
  roomsHref = '#rooms',
}: {
  name: string;
  slug: string;
  rate?: BookingBoxRate;
  checkin: string;
  checkout: string;
  adults: number;
  link: BookingBoxLink;
  testMode?: boolean;
  score?: number;
  reviewCount?: number;
  roomsHref?: string;
}) {
  const payload = { item_id: slug, item_name: name, partner: link.partner, placement: link.placement, client_reference: link.clientReference, hotel_id: link.hotelId, nightly_shown: rate?.nightly.amount };
  const label = rate ? 'Book this stay' : 'Check rates';
  const fetched = rate ? new Date(rate.fetchedAt).toLocaleString('en-US', { timeZone: 'America/Chicago' }) : undefined;

  const button = link.url ? (
    <a href={link.url} target="_blank" rel="noopener noreferrer sponsored" className="btn-primary min-h-12 w-full" onClick={() => track(ANALYTICS_EVENTS.HOTEL_AFFILIATE_CLICKED, payload)}>
      {label}
      <span className="sr-only"> (opens our booking site in a new tab)</span>
    </a>
  ) : (
    <p className="text-sm text-ink-soft">Booking is not available right now.</p>
  );

  return (
    <>
      <aside className="space-y-4 rounded-card border border-paper-edge bg-white p-5 shadow-sm lg:sticky lg:top-20" aria-label="Book this hotel">
        <p className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
          <span className={`inline-block h-2 w-2 rounded-full ${rate ? 'bg-ink' : 'bg-paper-edge'}`} aria-hidden="true" />
          {rate ? 'Live rate' : 'Rate on the booking site'}
        </p>
        {rate ? (
          <div title={fetched ? `Rate fetched ${fetched} Nashville time` : undefined}>
            <p className="font-sans text-[2.25rem] font-extrabold leading-none tracking-[-0.03em] text-ink">{formatNightly(rate.nightly)}</p>
            <p className="mt-1 text-sm text-ink-soft">
              a night · {formatNightly(rate.total)} for {rate.nights} {rate.nights === 1 ? 'night' : 'nights'}
              {rate.refundable === 'RFN' ? ' · free cancellation available' : ''}
            </p>
          </div>
        ) : (
          <p className="text-sm text-ink-soft">Choose dates on the booking site to see tonight&rsquo;s rate.</p>
        )}
        {score !== undefined && reviewCount ? (
          <p className="flex items-center gap-2 text-sm">
            <span className="rounded bg-ink px-2 py-0.5 font-bold text-paper">{scoreOutOfTen(score).toFixed(1)}</span>
            <span className="font-semibold text-ink">{scoreWord(scoreOutOfTen(score))}</span>
            <a href="#reviews" className="text-ink-soft underline underline-offset-2">
              {reviewCount.toLocaleString()} reviews
            </a>
          </p>
        ) : null}
        <dl className="divide-y divide-paper-edge border-y border-paper-edge text-sm">
          <div className="flex items-center justify-between py-2">
            <dt className="text-2xs font-semibold uppercase tracking-[0.14em] text-ink-soft">Check-in</dt>
            <dd className="font-semibold text-ink">{dayLabel(checkin)}</dd>
          </div>
          <div className="flex items-center justify-between py-2">
            <dt className="text-2xs font-semibold uppercase tracking-[0.14em] text-ink-soft">Check-out</dt>
            <dd className="font-semibold text-ink">{dayLabel(checkout)}</dd>
          </div>
          <div className="flex items-center justify-between py-2">
            <dt className="text-2xs font-semibold uppercase tracking-[0.14em] text-ink-soft">Party</dt>
            <dd className="font-semibold text-ink">
              {adults} {adults === 1 ? 'adult' : 'adults'}
            </dd>
          </div>
        </dl>
        {button}
        <a href={roomsHref} className="block text-center text-sm font-semibold text-ink underline underline-offset-2">
          Compare rooms and rates
        </a>
        {testMode ? <TestModeNotice compact /> : null}
        {link.placement === 'whitelabel' ? <AffiliateDisclosure variant="stay" compact /> : null}
      </aside>

      {/* Phone and tablet: the same button pinned above the bottom navigation. */}
      <div className="fixed inset-x-0 bottom-16 z-40 border-t border-paper-edge bg-paper/95 px-4 py-2 backdrop-blur md:bottom-0 lg:hidden" role="region" aria-label="Book this hotel">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div className="min-w-0">
            {rate ? (
              <>
                <p className="font-sans text-lg font-extrabold leading-tight text-ink">{formatNightly(rate.nightly)} <span className="text-sm font-normal text-ink-soft">a night</span></p>
                <p className="truncate text-2xs text-ink-soft">
                  {dayLabel(checkin)} to {dayLabel(checkout)} · {formatNightly(rate.total)} total
                </p>
              </>
            ) : (
              <p className="text-sm text-ink-soft">
                {dayLabel(checkin)} to {dayLabel(checkout)}
              </p>
            )}
          </div>
          {link.url ? (
            <a href={link.url} target="_blank" rel="noopener noreferrer sponsored" className="btn-primary min-h-11 shrink-0 px-5" onClick={() => track(ANALYTICS_EVENTS.HOTEL_AFFILIATE_CLICKED, { ...payload, placement: link.placement })}>
              {rate ? 'Book' : 'Check rates'}
            </a>
          ) : null}
        </div>
      </div>
    </>
  );
}
