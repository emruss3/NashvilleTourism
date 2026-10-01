'use client';

import { useEffect, useId, useRef, useState } from 'react';
import StayDatesField from '@/components/StayDatesField';
import PhotoFlipper from '@/components/hotels/PhotoFlipper';
import TestModeNotice from '@/components/hotels/TestModeNotice';
import { ANALYTICS_EVENTS, track } from '@/lib/analytics';
import type { RoomGroup, RoomRate } from '@/lib/hotel-rooms';
import { clientReference, stayCheckoutHref, stayHotelHref } from '@/lib/stay-links';

/**
 * Room options for one hotel, laid out the KindredTrips way: one row per
 * room type with the photos (flip-through plus a thumbnail strip) on the
 * left, the room's facts in the middle, and a stack of rate cards on the
 * right, one per board and cancellation kind, each with its own Select
 * button. Dates change in place and refetch from /api/hotels/rooms/ (the
 * service role stays on the server). Every price carries its fetch time.
 * Select opens our booking site on this hotel with the same dates, or
 * straight at the offer when direct checkout is in test or on, in the same
 * tab (checkout is part of one site); nothing is booked or held from here.
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

/** Rows shown before "Show all"; a big hotel has twenty room types and nobody reads past six. */
const VISIBLE_CARDS = 6;
/** Rate cards shown per room before "N more rates". */
const VISIBLE_RATES = 3;
const DESCRIPTION_CLAMP = 180;

function usd(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

function chicago(iso: string, withTime = true): string {
  return new Date(iso).toLocaleString('en-US', withTime ? { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' } : { timeZone: 'America/Chicago', month: 'short', day: 'numeric' });
}

/** "Free cancel by Nov 28" / "Non-refundable" / "Cancellation on the booking site". */
function cancelTag(rate: RoomRate): { text: string; good: boolean } {
  if (rate.refundable === 'RFN') return { text: rate.cancelBy ? `Free cancel by ${chicago(rate.cancelBy, false)}` : 'Free cancellation', good: true };
  if (rate.refundable === 'NRFN') return { text: 'Non-refundable', good: false };
  return { text: 'Cancellation on the booking site', good: false };
}

function boardTag(rate: RoomRate): { text: string; good: boolean } {
  if (!rate.boardName || /room only/i.test(rate.boardName)) return { text: 'Room only', good: false };
  return { text: rate.boardName, good: true };
}

/** "Includes $62 taxes and fees" and "plus $45 resort fee at the hotel", from the provider's breakdown. */
function feesLine(rate: RoomRate): string | undefined {
  if (!rate.taxesAndFees.length) return undefined;
  const sum = (items: typeof rate.taxesAndFees) => items.reduce((n, t) => n + t.amount, 0);
  const inc = rate.taxesAndFees.filter((t) => t.included);
  const exc = rate.taxesAndFees.filter((t) => !t.included);
  const parts: string[] = [];
  if (inc.length) parts.push(`includes ${usd(sum(inc), inc[0].currency)} taxes and fees`);
  if (exc.length) parts.push(`plus ${usd(sum(exc), exc[0].currency)} ${exc.length === 1 && exc[0].description ? exc[0].description.toLowerCase() : 'in fees'} at the hotel`);
  return parts.length ? `Total ${parts.join(', ')}` : undefined;
}

function sleepsLine(group: RoomGroup): { main: string; detail?: string } | undefined {
  const r = group.cheapest;
  const max = group.maxOccupancy ?? r.maxOccupancy;
  const detail = [group.maxAdults ? `max ${group.maxAdults} ${group.maxAdults === 1 ? 'adult' : 'adults'}` : undefined, group.maxChildren ? `max ${group.maxChildren} ${group.maxChildren === 1 ? 'child' : 'children'}` : undefined].filter(Boolean).join(', ');
  if (max) return { main: `Sleeps ${max}`, detail: detail || undefined };
  if (r.adultCount) return { main: `Sleeps ${r.adultCount + (r.childCount ?? 0)}`, detail: detail || undefined };
  return undefined;
}

function payLine(rate: RoomRate): string | undefined {
  const t = rate.paymentTypes.map((p) => p.toLowerCase());
  if (t.some((p) => /pay_later|pay at|property/.test(p))) return 'Pay at the hotel';
  return undefined;
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
  const [showAll, setShowAll] = useState(false);
  const [moreRates, setMoreRates] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [photoIndex, setPhotoIndex] = useState<Record<string, number>>({});
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

  // Room-level Select: the offer's checkout when direct checkout is in test or on, else the hotel page. Same dates, party and reference either way.
  function cta(rate: RoomRate): string | undefined {
    return (rate.offerId ? stayCheckoutHref(rate.offerId, { surface: 'room', checkin, checkout, adults, clientReference: reference }) : undefined) ?? hotelHref;
  }

  function onSelect(group: RoomGroup, rate: RoomRate) {
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

  const tag = (t: { text: string; good: boolean }) => (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-2xs font-semibold ${t.good ? 'border-ink bg-paper text-ink' : 'border-paper-edge bg-paper-sunk text-ink-soft'}`}>
      {t.good ? <span aria-hidden="true" className="mr-1">✓</span> : null}
      {t.text}
    </span>
  );

  return (
    <section aria-labelledby={`${id}-h`} className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id={`${id}-h`} className="flex flex-wrap items-center gap-2 text-2xl">
            Rooms
            {data?.groups.length ? <span className="rounded-full border border-paper-edge bg-paper-sunk px-2.5 py-0.5 font-sans text-xs font-semibold text-ink-soft">{data.groups.length} {data.groups.length === 1 ? 'option' : 'options'}</span> : null}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            {data?.groups.length ? `For ${nights} ${nights === 1 ? 'night' : 'nights'}${data.rateCount && data.rateCount > data.groups.length ? `, from ${data.rateCount} rates` : ''}` : 'Pick your dates to see every room'}
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
            <a href={hotelHref} rel="noopener noreferrer sponsored" className="btn-secondary mt-3 inline-flex">
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
            const photos = group.photos.map((p) => ({ url: p.url, caption: p.caption || (group.photosSource === 'matched' ? group.name : `${hotelName} photo`) }));
            const pi = Math.min(photoIndex[group.key] ?? 0, Math.max(photos.length - 1, 0));
            const sleeps = sleepsLine(group);
            const facts = [group.size, group.bedTypes.length ? group.bedTypes.slice(0, 2).join(' · ') : undefined].filter(Boolean);
            const rates = moreRates[group.key] ? group.variants : group.variants.slice(0, VISIBLE_RATES);
            const hidden = group.variants.length - rates.length;
            const long = (group.description?.length ?? 0) > DESCRIPTION_CLAMP;
            const descOpen = Boolean(expanded[group.key]);
            return (
              <li key={group.key} className="card overflow-hidden">
                <div className="grid min-w-0 lg:grid-cols-[240px_minmax(0,1fr)_280px]">
                  {/* Photos: the frame flips; the strip jumps. */}
                  <div className="relative flex min-w-0 flex-col bg-paper-sunk">
                    {photos.length ? (
                      <>
                        <PhotoFlipper images={photos} name={group.name} ratio="aspect-[3/2] lg:aspect-auto lg:min-h-[220px]" className="lg:flex-1" rounded={false} index={pi} onIndexChange={(i) => setPhotoIndex((x) => ({ ...x, [group.key]: i }))} />
                        {photos.length > 1 ? (
                          <ul className="flex gap-1 overflow-x-auto bg-ink/80 p-1.5" aria-label={`${group.name} photo thumbnails`}>
                            {photos.map((p, i) => (
                              <li key={p.url} className="shrink-0">
                                <button type="button" onClick={() => setPhotoIndex((x) => ({ ...x, [group.key]: i }))} aria-label={`Photo ${i + 1} of ${photos.length}`} aria-current={i === pi ? 'true' : undefined} className={`relative block h-9 w-12 overflow-hidden rounded-sm ${i === pi ? 'ring-2 ring-paper' : 'opacity-60 hover:opacity-100'}`}>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={p.url} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" draggable={false} />
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </>
                    ) : (
                      <div className="flex aspect-[3/2] items-center justify-center text-sm text-ink-soft lg:h-full lg:aspect-auto lg:min-h-[200px]">No room photo supplied</div>
                    )}
                    {photos.length && group.photosSource !== 'matched' ? <span className="absolute left-2 top-2 rounded bg-ink/80 px-1.5 py-0.5 text-2xs text-paper">{group.photosSource === 'similar' ? 'Similar room' : 'Hotel photo'}</span> : null}
                  </div>

                  {/* Facts. */}
                  <div className="min-w-0 p-4 lg:p-5">
                    <h3 className="font-sans text-[18px] font-bold leading-snug text-ink">{group.name}</h3>
                    {sleeps ? (
                      <p className="mt-1.5 text-[15px] text-ink">
                        <span className="font-semibold">{sleeps.main}</span>
                        {sleeps.detail ? <span className="text-ink-soft"> ({sleeps.detail})</span> : null}
                      </p>
                    ) : null}
                    {facts.length ? <p className="mt-1 text-sm text-ink-soft">{facts.join(' · ')}</p> : null}
                    {group.description ? (
                      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                        {descOpen || !long ? group.description : `${group.description.slice(0, DESCRIPTION_CLAMP - 1).trimEnd()}…`}
                        {long ? (
                          <>
                            {' '}
                            <button type="button" className="font-semibold text-ink underline underline-offset-2" aria-expanded={descOpen} onClick={() => setExpanded((x) => ({ ...x, [group.key]: !descOpen }))}>
                              {descOpen ? 'Less' : 'More'}
                            </button>
                          </>
                        ) : null}
                      </p>
                    ) : null}
                    {group.cheapest.remarks ? <p className="mt-2 text-2xs text-ink-soft">Hotel note: {group.cheapest.remarks}</p> : null}
                    {group.amenities.length ? (
                      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Room amenities">
                        {(descOpen ? group.amenities : group.amenities.slice(0, 6)).map((a) => (
                          <li key={a} className="rounded-full border border-paper-edge bg-paper px-2.5 py-1 text-2xs text-ink">
                            {a}
                          </li>
                        ))}
                        {!descOpen && group.amenities.length > 6 ? (
                          <li>
                            <button type="button" className="rounded-full border border-ink px-2.5 py-1 text-2xs font-semibold text-ink" onClick={() => setExpanded((x) => ({ ...x, [group.key]: true }))}>
                              +{group.amenities.length - 6} more
                            </button>
                          </li>
                        ) : null}
                      </ul>
                    ) : null}
                  </div>

                  {/* Rate cards. */}
                  <div className="grid content-start gap-2 border-t border-paper-edge bg-paper-sunk/60 p-3 lg:border-l lg:border-t-0">
                    {rates.map((rate, i) => {
                      const href = cta(rate);
                      const board = boardTag(rate);
                      const cancel = cancelTag(rate);
                      const pay = payLine(rate);
                      const fees = feesLine(rate);
                      return (
                        <div key={rate.rateId ?? rate.offerId ?? i} className="rounded-card border border-paper-edge bg-white p-3">
                          <div className="flex items-start justify-between gap-3">
                            <p className="min-w-0 font-sans text-[15px] font-bold leading-snug text-ink">{board.text}</p>
                            {/* Nightly leads; the stay total lives in the booking box on the right of the page. */}
                            <p className="shrink-0 text-right">
                              <span className="block font-sans text-lg font-extrabold leading-none text-ink">
                                {usd(rate.nightly.amount, rate.nightly.currency)}
                                <span className="text-xs font-semibold text-ink-soft"> / night</span>
                              </span>
                              <span className="block text-2xs text-ink-soft">
                                {usd(rate.total.amount, rate.total.currency)} for {rate.nights} {rate.nights === 1 ? 'night' : 'nights'}
                              </span>
                            </p>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {board.good ? tag(board) : null}
                            {tag(cancel)}
                            {pay ? tag({ text: pay, good: false }) : null}
                          </div>
                          {fees ? <p className="mt-1.5 text-2xs text-ink-soft">{fees}</p> : null}
                          {rate.perks.length ? <p className="mt-1 text-2xs text-ink-soft">{rate.perks.join(' · ')}</p> : null}
                          {href ? (
                            <a href={href} rel="noopener noreferrer sponsored" className="btn-primary mt-3 min-h-10 w-full py-2" onClick={() => onSelect(group, rate)}>
                              Select
                              <span className="sr-only">
                                {' '}
                                {group.name}, {board.text}, {usd(rate.total.amount, rate.total.currency)}
                              </span>
                            </a>
                          ) : (
                            <p className="mt-3 text-2xs text-ink-soft">Booking site not configured.</p>
                          )}
                        </div>
                      );
                    })}
                    {hidden > 0 ? (
                      <button type="button" className="min-h-9 text-sm font-semibold text-ink underline underline-offset-2" onClick={() => setMoreRates((x) => ({ ...x, [group.key]: true }))}>
                        {hidden} more {hidden === 1 ? 'rate' : 'rates'} for this room
                      </button>
                    ) : null}
                  </div>
                </div>
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
