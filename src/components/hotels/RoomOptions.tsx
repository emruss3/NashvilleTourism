'use client';

import { useEffect, useId, useRef, useState } from 'react';
import StayDatesField from '@/components/StayDatesField';
import PhotoFlipper from '@/components/hotels/PhotoFlipper';
import TestModeNotice from '@/components/hotels/TestModeNotice';
import { ANALYTICS_EVENTS, track } from '@/lib/analytics';
import { normalizedName, type RoomGroup, type RoomRate } from '@/lib/hotel-rooms';
import { clientReference, stayCheckoutHref, stayHotelHref } from '@/lib/stay-links';

/**
 * Room options for one hotel: the KindredTrips detail list, one card per
 * room type and board with the cheapest rate up front and the other rates
 * of that room behind "More rates". Dates change in place and refetch from
 * /api/hotels/rooms/ (the service role stays on the server). Every price
 * carries its fetch time. The CTA opens our booking site on this hotel with
 * the same dates, or straight at the offer when direct checkout is enabled;
 * nothing is booked or held from here.
 */

export interface RoomsPayload {
  ok: boolean;
  hotelId: string;
  checkin: string;
  checkout: string;
  adults: number;
  cached?: boolean;
  environment?: string;
  fetchedAt?: string;
  attribution?: string;
  rateCount?: number;
  hotel?: { name: string; checkinTime?: string; checkoutTime?: string } | null;
  groups: RoomGroup[];
  error?: string;
}

/** Cards shown before "Show all"; a big hotel has twenty room types and nobody reads past six. */
const VISIBLE_CARDS = 6;

function usd(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

function chicago(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function cancellationLine(rate: RoomRate): string {
  if (rate.refundable === 'RFN') return rate.cancelBy ? `Free cancellation until ${chicago(rate.cancelBy)} Nashville time` : 'Free cancellation available';
  if (rate.refundable === 'NRFN') return 'Non-refundable';
  return 'Cancellation terms on the booking site';
}

/** "Includes $62 taxes and fees" and "plus $45 resort fee at the hotel", from the provider's breakdown. */
function feesLine(rate: RoomRate): string | undefined {
  if (!rate.taxesAndFees.length) return undefined;
  const sum = (items: typeof rate.taxesAndFees) => items.reduce((n, t) => n + t.amount, 0);
  const inc = rate.taxesAndFees.filter((t) => t.included);
  const exc = rate.taxesAndFees.filter((t) => !t.included);
  const parts: string[] = [];
  if (inc.length) parts.push(`includes ${usd(sum(inc), inc[0].currency)} taxes and fees`);
  if (exc.length) parts.push(`plus ${usd(sum(exc), exc[0].currency)} ${exc.length === 1 && exc[0].description ? exc[0].description.toLowerCase() : 'in fees'} paid at the hotel`);
  return parts.length ? `Total ${parts.join(', ')}` : undefined;
}

function sleepsLine(group: RoomGroup): string | undefined {
  const r = group.cheapest;
  if (r.adultCount && (r.childCount ?? 0) > 0) return `Sleeps ${r.adultCount} ${r.adultCount === 1 ? 'adult' : 'adults'} and ${r.childCount} ${r.childCount === 1 ? 'child' : 'children'}`;
  if (group.maxOccupancy) return `Sleeps ${group.maxOccupancy}`;
  return undefined;
}

function payLine(rate: RoomRate): string | undefined {
  const t = rate.paymentTypes.map((p) => p.toLowerCase());
  if (t.some((p) => /pay_later|pay at|property/.test(p))) return 'Pay at the hotel';
  return undefined;
}

function boardLine(rate: RoomRate): string | undefined {
  if (!rate.boardName || /room only/i.test(rate.boardName)) return undefined;
  return rate.boardName;
}

function todayISO(): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export default function RoomOptions({
  hotelId,
  hotelName,
  slug,
  surface,
  initial,
  initialCheckin,
  initialCheckout,
  adults = 2,
}: {
  hotelId: string;
  hotelName: string;
  /** Editorial slug when the hotel has our own page; the provider id otherwise. */
  slug: string;
  surface: string;
  /** Server-rendered first answer, so the list is there on load. */
  initial?: RoomsPayload;
  initialCheckin: string;
  initialCheckout: string;
  adults?: number;
}) {
  const id = useId();
  const [checkin, setCheckin] = useState(initialCheckin);
  const [checkout, setCheckout] = useState(initialCheckout);
  const [data, setData] = useState<RoomsPayload | undefined>(initial);
  const [loading, setLoading] = useState(!initial);
  const [error, setError] = useState<string | undefined>(initial && !initial.ok ? initial.error : undefined);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [showAll, setShowAll] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const abortRef = useRef<AbortController | null>(null);
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current && initial) {
      firstRun.current = false;
      track(ANALYTICS_EVENTS.HOTEL_ROOMS_VIEWED, { item_id: slug, item_name: hotelName, hotel_id: hotelId, result_count: initial.groups.length, cached: initial.cached });
      return;
    }
    firstRun.current = false;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(undefined);
    const qs = new URLSearchParams({ hotelId, checkin, checkout, adults: String(adults) });
    fetch(`/api/hotels/rooms/?${qs.toString()}`, { signal: controller.signal })
      .then(async (res) => {
        const body = (await res.json()) as RoomsPayload;
        if (!res.ok || !body.ok) throw new Error(body.error || 'Rates are not available right now.');
        setData(body);
        setShowAll(false);
        track(ANALYTICS_EVENTS.HOTEL_ROOMS_VIEWED, { item_id: slug, item_name: hotelName, hotel_id: hotelId, result_count: body.groups.length, cached: body.cached });
      })
      .catch((err: unknown) => {
        if ((err as Error)?.name === 'AbortError') return;
        setError((err as Error)?.message || 'Rates are not available right now.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkin, checkout, adults, hotelId]);

  const testMode = data?.environment === 'sandbox';
  const reference = clientReference(surface, slug);
  const hotelHref = stayHotelHref(hotelId, { checkin, checkout, adults, clientReference: reference });
  const nights = data?.groups[0]?.cheapest.nights ?? Math.max(1, Math.round((Date.parse(`${checkout}T00:00:00Z`) - Date.parse(`${checkin}T00:00:00Z`)) / 86_400_000));
  const fetched = data?.fetchedAt ? chicago(data.fetchedAt) : undefined;

  function cta(rate: RoomRate): string | undefined {
    return (rate.offerId ? stayCheckoutHref(rate.offerId, { clientReference: reference }) : undefined) ?? hotelHref;
  }

  function onRoomClick(group: RoomGroup, rate: RoomRate) {
    track(ANALYTICS_EVENTS.HOTEL_ROOM_CLICKED, {
      item_id: slug,
      item_name: hotelName,
      hotel_id: hotelId,
      partner: 'LiteAPI',
      placement: 'whitelabel',
      client_reference: reference,
      nightly_shown: rate.nightly.amount,
      room_name: group.name,
      board: rate.boardName,
      refundable: rate.refundable,
    });
  }

  return (
    <section aria-labelledby={`${id}-h`} className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id={`${id}-h`} className="text-2xl">
            Rooms and rates
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            {data?.groups.length ? `${data.groups.length} room ${data.groups.length === 1 ? 'type' : 'types'}${data.rateCount && data.rateCount > data.groups.length ? ` from ${data.rateCount} rates` : ''} for ${nights} ${nights === 1 ? 'night' : 'nights'}` : 'Pick your dates to see every room'}
            {fetched ? ` · prices fetched ${fetched} Nashville time` : ''}
          </p>
        </div>
        <div className="w-full sm:w-auto sm:min-w-[300px]">
          <label htmlFor={`${id}-dates`} className="field-label">
            Dates
          </label>
          <StayDatesField
            id={`${id}-dates`}
            checkin={checkin}
            checkout={checkout}
            min={todayISO()}
            onChange={(next) => {
              setCheckin(next.checkin);
              setCheckout(next.checkout);
            }}
          />
        </div>
      </div>

      {testMode ? <TestModeNotice /> : null}

      {loading ? (
        <p role="status" className="rounded-card border border-paper-edge bg-paper-sunk px-4 py-6 text-center text-sm text-ink-soft">
          Checking rooms for these dates…
        </p>
      ) : error ? (
        <div role="alert" className="rounded-card border border-paper-edge bg-paper-sunk px-4 py-6 text-sm text-ink">
          <p>{error}</p>
          {hotelHref ? (
            <a href={hotelHref} target="_blank" rel="noopener noreferrer sponsored" className="btn-secondary mt-3 inline-flex">
              Check rates on our booking site
            </a>
          ) : null}
        </div>
      ) : !data?.groups.length ? (
        <div className="rounded-card border border-paper-edge bg-paper-sunk px-4 py-6 text-sm text-ink">
          <p>No rooms are on sale for these dates. Try other dates, or ask the hotel directly.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {(showAll ? data.groups : data.groups.slice(0, VISIBLE_CARDS)).map((group) => {
            const more = group.variants.slice(1);
            const isOpen = Boolean(open[group.key]);
            const photo = group.photos[0];
            const href = cta(group.cheapest);
            return (
              <li key={group.key} className="card overflow-hidden">
                <div className="grid gap-0 sm:grid-cols-[220px_1fr]">
                  <div className="relative">
                    {photo ? (
                      <PhotoFlipper images={group.photos.map((p) => ({ url: p.url, caption: p.caption || (group.photosSource === 'matched' ? group.name : `${hotelName} photo`) }))} name={group.name} ratio="aspect-[3/2] sm:aspect-[4/3]" rounded={false} className="sm:h-full" />
                    ) : (
                      <div className="flex aspect-[3/2] items-center justify-center bg-paper-sunk text-sm text-ink-soft">No room photo supplied</div>
                    )}
                    {group.photosSource === 'hotel' && photo ? <span className="absolute bottom-2 left-2 rounded bg-ink/80 px-1.5 py-0.5 text-2xs text-paper">Hotel photo</span> : null}
                  </div>
                  <div className="flex flex-col p-4">
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                      <div className="min-w-0">
                        <h3 className="font-sans text-[17px] font-bold leading-snug text-ink">{group.name}</h3>
                        <p className="mt-1 text-sm text-ink-soft">
                          {[
                            sleepsLine(group),
                            group.bedTypes.length ? group.bedTypes.slice(0, 2).join(', ') : undefined,
                            group.size,
                            boardLine(group.cheapest),
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </div>
                      <p className="text-right">
                        <span className="block text-lg font-semibold text-ink">{usd(group.cheapest.nightly.amount, group.cheapest.nightly.currency)}</span>
                        <span className="block text-2xs text-ink-soft">
                          a night · {usd(group.cheapest.total.amount, group.cheapest.total.currency)} for {group.cheapest.nights} {group.cheapest.nights === 1 ? 'night' : 'nights'}
                        </span>
                      </p>
                    </div>
                    <p className="mt-2 text-2xs text-ink-soft">{[cancellationLine(group.cheapest), payLine(group.cheapest)].filter(Boolean).join(' · ')}</p>
                    {feesLine(group.cheapest) ? <p className="mt-0.5 text-2xs text-ink-soft">{feesLine(group.cheapest)}</p> : null}
                    {group.cheapest.perks.length ? <p className="mt-1 text-2xs text-ink-soft">{group.cheapest.perks.join(' · ')}</p> : null}
                    {group.description ? (
                      <p className="mt-2 text-sm text-ink-soft">
                        {isOpen || group.description.length <= 160 ? group.description : `${group.description.slice(0, 157).trimEnd()}…`}
                      </p>
                    ) : null}
                    {group.cheapest.remarks ? <p className="mt-1 text-2xs text-ink-soft">Hotel note: {group.cheapest.remarks}</p> : null}
                    {group.amenities.length ? (
                      <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Room amenities">
                        {(expanded[group.key] ? group.amenities : group.amenities.slice(0, 5)).map((a) => (
                          <li key={a} className="rounded-full border border-paper-edge px-2 py-0.5 text-2xs text-ink-soft">
                            {a}
                          </li>
                        ))}
                        {group.amenities.length > 5 ? (
                          <li>
                            <button type="button" className="rounded-full border border-ink px-2 py-0.5 text-2xs font-semibold text-ink" aria-expanded={Boolean(expanded[group.key])} onClick={() => setExpanded((x) => ({ ...x, [group.key]: !x[group.key] }))}>
                              {expanded[group.key] ? 'Fewer' : `+${group.amenities.length - 5} more`}
                            </button>
                          </li>
                        ) : null}
                      </ul>
                    ) : null}
                    <div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
                      {href ? (
                        <a href={href} target="_blank" rel="noopener noreferrer sponsored" className="btn-primary min-h-11" onClick={() => onRoomClick(group, group.cheapest)}>
                          Book this room
                          <span className="sr-only"> (opens our booking site in a new tab)</span>
                        </a>
                      ) : (
                        <p className="text-sm text-ink-soft">Booking site not configured.</p>
                      )}
                      {more.length ? (
                        <button type="button" className="text-sm font-semibold text-clay underline underline-offset-2" aria-expanded={isOpen} aria-controls={`${id}-${group.key.replace(/[^a-z0-9]+/gi, '-')}`} onClick={() => setOpen((o) => ({ ...o, [group.key]: !isOpen }))}>
                          {isOpen ? 'Fewer options' : `${more.length} more ${more.length === 1 ? 'option' : 'options'}`}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
                {more.length && isOpen ? (
                  <ul id={`${id}-${group.key.replace(/[^a-z0-9]+/gi, '-')}`} className="divide-y divide-paper-edge border-t border-paper-edge bg-paper-sunk">
                    {more.map((rate, i) => {
                      const vhref = cta(rate);
                      return (
                        <li key={rate.rateId ?? rate.offerId ?? i} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                          <div>
                            <p className="text-ink">{[boardLine(rate) ?? 'Room only', cancellationLine(rate)].join(' · ')}</p>
                            {feesLine(rate) ? <p className="text-2xs text-ink-soft">{feesLine(rate)}</p> : null}
                            {rate.roomName && normalizedName(rate.roomName) !== normalizedName(group.cheapest.roomName) ? <p className="text-2xs text-ink-soft">Listed by the supplier as “{rate.roomName}”</p> : null}
                            {rate.perks.length ? <p className="text-2xs text-ink-soft">{rate.perks.join(' · ')}</p> : null}
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="text-right">
                              <span className="block font-semibold text-ink">{usd(rate.nightly.amount, rate.nightly.currency)}</span>
                              <span className="block text-2xs text-ink-soft">a night · {usd(rate.total.amount, rate.total.currency)} total</span>
                            </p>
                            {vhref ? (
                              <a href={vhref} target="_blank" rel="noopener noreferrer sponsored" className="btn-secondary min-h-10 px-3 py-1.5 text-sm" onClick={() => onRoomClick(group, rate)}>
                                Book
                                <span className="sr-only"> {group.name}, {boardLine(rate) ?? 'room only'} (opens our booking site in a new tab)</span>
                              </a>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {!loading && !error && data && data.groups.length > VISIBLE_CARDS && !showAll ? (
        <button type="button" className="btn-secondary" onClick={() => setShowAll(true)}>
          Show all {data.groups.length} room types
        </button>
      ) : null}

      {data?.attribution ? <p className="text-2xs text-ink-soft">{data.attribution}</p> : null}
      {data?.hotel?.checkinTime || data?.hotel?.checkoutTime ? (
        <p className="text-2xs text-ink-soft">
          {data.hotel.checkinTime ? `Check-in from ${data.hotel.checkinTime}` : ''}
          {data.hotel.checkinTime && data.hotel.checkoutTime ? ' · ' : ''}
          {data.hotel.checkoutTime ? `Check-out by ${data.hotel.checkoutTime}` : ''}
        </p>
      ) : null}
    </section>
  );
}
