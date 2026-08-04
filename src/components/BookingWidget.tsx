'use client';

import { useId, useState } from 'react';
import { ANALYTICS_EVENTS, track } from '@/lib/analytics';
import { partners } from '@/lib/partners';

type Tab = 'hotels' | 'tours' | 'tickets';

const TABS: { key: Tab; label: string; cta: string }[] = [
  { key: 'hotels', label: 'Find Hotels', cta: 'Check hotel rates' },
  { key: 'tours', label: 'Book Party Buses & Tours', cta: 'See availability' },
  { key: 'tickets', label: 'Get Concert Tickets', cta: 'Find tickets' },
];

const TOUR_TYPES = [
  'Party bus',
  'Pedal tavern',
  'Honky-tonk crawl',
  'Whiskey tasting',
  'City sightseeing',
  'Live music tour',
];

/** Today in YYYY-MM-DD, used as the minimum selectable date. */
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * The primary conversion surface. Three tabs, one row, always above the fold.
 * Each tab builds a partner deep link from the user's own inputs rather than
 * dumping them on a generic homepage.
 */
export default function BookingWidget({ compact = false }: { compact?: boolean }) {
  const [tab, setTab] = useState<Tab>('hotels');
  const [checkin, setCheckin] = useState('');
  const [checkout, setCheckout] = useState('');
  const [adults, setAdults] = useState(2);
  const [tourType, setTourType] = useState(TOUR_TYPES[0]);
  const [tourDate, setTourDate] = useState('');
  const [artist, setArtist] = useState('');
  const [ticketDate, setTicketDate] = useState('');
  const baseId = useId();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    let url = '';
    let event: (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS] = ANALYTICS_EVENTS.HOTEL_AFFILIATE_CLICKED;
    let partner = '';

    if (tab === 'hotels') {
      url = partners.hotels.build({ checkin, checkout, adults });
      event = ANALYTICS_EVENTS.HOTEL_AFFILIATE_CLICKED;
      partner = partners.hotels.name;
    } else if (tab === 'tours') {
      url = partners.tours.build({ query: tourType, date: tourDate });
      event = ANALYTICS_EVENTS.ACTIVITY_AFFILIATE_CLICKED;
      partner = partners.tours.name;
    } else {
      url = partners.tickets.build({ query: artist, date: ticketDate });
      event = ANALYTICS_EVENTS.TICKET_AFFILIATE_CLICKED;
      partner = partners.tickets.name;
    }

    track(event, { partner, placement: 'affiliate', item_type: tab, item_id: `widget_${tab}` });
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  const active = TABS.find((t) => t.key === tab)!;

  return (
    <div className="overflow-hidden rounded-card border border-paper-edge bg-white shadow-lift">
      {/* Tabs */}
      <div role="tablist" aria-label="What do you want to book?" className="flex border-b border-paper-edge bg-paper-sunk">
        {TABS.map((t) => {
          const selected = t.key === tab;
          return (
            <button
              key={t.key}
              role="tab"
              id={`${baseId}-tab-${t.key}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${t.key}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setTab(t.key)}
              onKeyDown={(e) => {
                const i = TABS.findIndex((x) => x.key === tab);
                if (e.key === 'ArrowRight') setTab(TABS[(i + 1) % TABS.length].key);
                if (e.key === 'ArrowLeft') setTab(TABS[(i - 1 + TABS.length) % TABS.length].key);
              }}
              className={`flex-1 px-3 py-3.5 text-center text-[13px] font-bold leading-tight transition-colors sm:text-sm ${
                selected
                  ? 'bg-white text-clay shadow-[inset_0_-2px_0_0_theme(colors.clay.DEFAULT)]'
                  : 'text-ink-soft hover:bg-white/60 hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* The tabpanel role goes on a wrapper, not the form. A <form> has its own
          implicit role and `tabpanel` is not permitted on it. */}
      <div
        role="tabpanel"
        id={`${baseId}-panel-${tab}`}
        aria-labelledby={`${baseId}-tab-${tab}`}
      >
      <form
        onSubmit={submit}
        aria-label={`${active.label} search`}
        className={`grid gap-3 p-4 sm:p-5 ${compact ? '' : 'lg:grid-cols-[repeat(3,minmax(0,1fr))_auto]'}`}
      >
        {tab === 'hotels' && (
          <>
            <Field label="Check in" id={`${baseId}-ci`}>
              <input
                id={`${baseId}-ci`}
                type="date"
                min={todayISO()}
                value={checkin}
                onChange={(e) => setCheckin(e.target.value)}
                className="field-input"
              />
            </Field>
            <Field label="Check out" id={`${baseId}-co`}>
              <input
                id={`${baseId}-co`}
                type="date"
                min={checkin || todayISO()}
                value={checkout}
                onChange={(e) => setCheckout(e.target.value)}
                className="field-input"
              />
            </Field>
            <Field label="Guests" id={`${baseId}-ad`}>
              <select
                id={`${baseId}-ad`}
                value={adults}
                onChange={(e) => setAdults(Number(e.target.value))}
                className="field-input"
              >
                {[1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'guest' : 'guests'}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}

        {tab === 'tours' && (
          <>
            <Field label="Experience" id={`${baseId}-tt`} className="lg:col-span-2">
              <select
                id={`${baseId}-tt`}
                value={tourType}
                onChange={(e) => setTourType(e.target.value)}
                className="field-input"
              >
                {TOUR_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Date" id={`${baseId}-td`}>
              <input
                id={`${baseId}-td`}
                type="date"
                min={todayISO()}
                value={tourDate}
                onChange={(e) => setTourDate(e.target.value)}
                className="field-input"
              />
            </Field>
          </>
        )}

        {tab === 'tickets' && (
          <>
            <Field label="Artist, venue, or event" id={`${baseId}-ar`} className="lg:col-span-2">
              <input
                id={`${baseId}-ar`}
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="Search all Nashville shows"
                className="field-input"
              />
            </Field>
            <Field label="From date" id={`${baseId}-kd`}>
              <input
                id={`${baseId}-kd`}
                type="date"
                min={todayISO()}
                value={ticketDate}
                onChange={(e) => setTicketDate(e.target.value)}
                className="field-input"
              />
            </Field>
          </>
        )}

        <div className="flex items-end">
          <button type="submit" className="btn-primary h-[46px] w-full whitespace-nowrap px-6">
            {active.cta}
          </button>
        </div>
      </form>
      </div>

      <p className="border-t border-paper-edge bg-paper-sunk px-4 py-2 text-2xs text-ink-faint sm:px-5">
        We earn a commission on bookings made through these partners. It never changes what we
        recommend.
      </p>
    </div>
  );
}

function Field({
  label,
  id,
  children,
  className = '',
}: {
  label: string;
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-2xs font-bold uppercase tracking-wider text-ink-faint">
        {label}
      </label>
      {children}
    </div>
  );
}
