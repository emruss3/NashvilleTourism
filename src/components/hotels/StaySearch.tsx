'use client';

import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { CalendarIcon, PeopleIcon, PinIcon } from '@/components/Icons';
import { ANALYTICS_EVENTS, track } from '@/lib/analytics';
import { hotelSearchPath } from '@/lib/hotel-booking';
import { partners } from '@/lib/partners';

/** Nashville-local today in YYYY-MM-DD, the minimum selectable check-in. */
function todayISO(): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

/**
 * Stay search (page-designs/README.md §06). Destination is Nashville; the
 * form asks check-in, check-out and guests, with an optional neighborhood,
 * then stays on NSVL: /hotels/ carries the dates on every hotel's CTA and
 * checkout happens on our booking site from there. A plain GET form, so it
 * works without JavaScript too.
 */
export default function StaySearch({
  neighborhoods,
  initialNeighborhood,
  initialCheckin,
  initialCheckout,
  initialGuests,
}: {
  neighborhoods: { value: string; label: string }[];
  initialNeighborhood?: string;
  initialCheckin?: string;
  initialCheckout?: string;
  initialGuests?: number;
}) {
  const id = useId();
  const router = useRouter();
  const [checkin, setCheckin] = useState(initialCheckin ?? '');
  const [checkout, setCheckout] = useState(initialCheckout ?? '');
  const [guests, setGuests] = useState(initialGuests ?? 2);
  const [area, setArea] = useState(initialNeighborhood ?? '');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const url = hotelSearchPath({ checkin, checkout, adults: guests, neighborhood: area || undefined });
    track(ANALYTICS_EVENTS.HOTEL_AFFILIATE_CLICKED, { partner: 'NSVL', placement: 'editorial', item_type: 'hotels', item_id: 'stay_search', neighborhood: area || undefined, client_reference: `nsh:staysearch:${area || 'nashville'}` });
    router.push(url);
  }

  const field = 'field-input h-12 pl-11 md:h-14 md:text-base';
  const icon = 'pointer-events-none absolute left-3.5 top-[calc(50%+0.55rem)] -translate-y-1/2 text-ink-soft';
  const label = 'mb-1 block text-2xs font-semibold uppercase tracking-[0.14em] text-ink-soft';

  return (
    <form action="/hotels/" method="get" onSubmit={submit} aria-label="Check hotel rates" className="grid gap-2 sm:grid-cols-2">
      <div className="relative">
        <label htmlFor={`${id}-in`} className={label}>
          Check in
        </label>
        <span className={icon}>
          <CalendarIcon size={18} />
        </span>
        <input id={`${id}-in`} name="checkin" type="date" min={todayISO()} value={checkin} onChange={(e) => setCheckin(e.target.value)} className={field} />
      </div>
      <div className="relative">
        <label htmlFor={`${id}-out`} className={label}>
          Check out
        </label>
        <span className={icon}>
          <CalendarIcon size={18} />
        </span>
        <input id={`${id}-out`} name="checkout" type="date" min={checkin || todayISO()} value={checkout} onChange={(e) => setCheckout(e.target.value)} className={field} />
      </div>
      <div className="relative">
        <label htmlFor={`${id}-guests`} className={label}>
          Guests
        </label>
        <span className={icon}>
          <PeopleIcon size={18} />
        </span>
        <select id={`${id}-guests`} name="adults" value={guests} onChange={(e) => setGuests(Number(e.target.value))} className={field}>
          {[1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20].map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? 'guest' : 'guests'}
            </option>
          ))}
        </select>
      </div>
      <div className="relative">
        <label htmlFor={`${id}-area`} className={label}>
          Neighborhood
        </label>
        <span className={icon}>
          <PinIcon size={18} />
        </span>
        <select id={`${id}-area`} name="neighborhood" value={area} onChange={(e) => setArea(e.target.value)} className={field}>
          <option value="">Anywhere in Nashville</option>
          {neighborhoods.map((n) => (
            <option key={n.value} value={n.value}>
              {n.label}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <button type="submit" className="btn-primary w-full sm:w-auto md:h-14 md:px-8">
          Search hotels
          <span aria-hidden="true">→</span>
        </button>
        <p className="mt-2 text-2xs text-ink-soft">
          Your dates carry through to every hotel below. Checkout is on our booking site, run with Nuitée; “{partners.stay.merchant}” appears on your card statement. Room prices include our margin; it never changes which hotels we recommend.
        </p>
      </div>
    </form>
  );
}
