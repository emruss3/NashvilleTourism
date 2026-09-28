'use client';

import { useRef, useState } from 'react';
import DateField from '@/components/DateField';
import { ANALYTICS_EVENTS, track } from '@/lib/analytics';
import { neighborhoods } from '@/lib/content/neighborhoods';
import type { Need, Occasion } from '@/lib/events/types';
import { BUDGET_RANGES, EVENT_OCCASIONS, NEEDS, SHORTLIST_MAX, START_TIME_BANDS, guestsBand, monthOptions, monthToDate, occasionToEventType, type BriefPrefill } from '@/lib/private-events';
import { site } from '@/lib/site';
import { todayChicagoISO } from '@/lib/stay-dates';

type State = 'idle' | 'submitting' | 'done' | 'unavailable' | 'error';
type Receipt = { reference: string | null; venues: Array<{ slug: string; name: string; slaHours?: number; deadline?: string }> };

const LEGACY_TO_OCCASION: Record<string, Occasion> = { corporate: 'corporate', holiday: 'holiday', convention: 'convention', celebration: 'celebration', other: 'other' };

function readUtm(): Record<string, string> | undefined {
  if (typeof window === 'undefined') return undefined;
  const out: Record<string, string> = {};
  new URLSearchParams(window.location.search).forEach((v, k) => {
    if (/^utm_[a-z]+$/.test(k) && v) out[k] = v.slice(0, 120);
  });
  return Object.keys(out).length ? out : undefined;
}

function formatDeadline(iso?: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }).format(d);
}

/**
 * The brief. Five required fields (occasion, guests, a date or a month, name,
 * email) so it sends in under a minute; budget, neighborhoods, needs, phone,
 * organization and notes sit behind "Add detail" and can also be added later
 * from the link in the confirmation email. The venues section appears only
 * once at least one venue is published; until then the desk matches by hand.
 * Posts to /api/private-events/; success copy appears only on a confirmed
 * response, and a disconnected intake offers a mailto instead of pretending.
 */
export default function InquiryForm({ prefill = {}, shortlist = [], venuesListed = false }: { prefill?: BriefPrefill; shortlist?: Array<{ slug: string; name: string }>; venuesListed?: boolean }) {
  const [state, setState] = useState<State>('idle');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [occasion, setOccasion] = useState<string>(prefill.occasion ?? (prefill.type ? LEGACY_TO_OCCASION[prefill.type] : ''));
  const [guests, setGuests] = useState(prefill.guests ? String(prefill.guests) : '');
  const [dateMode, setDateMode] = useState<'date' | 'month'>('date');
  const [preferredDate, setPreferredDate] = useState(prefill.date ?? '');
  const [month, setMonth] = useState('');
  const [flexibleDates, setFlexibleDates] = useState(Boolean(prefill.flexible));
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [budget, setBudget] = useState('');
  const [hoods, setHoods] = useState<string[]>([]);
  const [needs, setNeeds] = useState<Need[]>([]);
  const [startTimeBand, setStartTimeBand] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [details, setDetails] = useState('');
  const [howHeard, setHowHeard] = useState('');
  const [picked, setPicked] = useState<Array<{ slug: string; name: string }>>(shortlist.slice(0, SHORTLIST_MAX));
  const [suggest, setSuggest] = useState(true);
  const [receipt, setReceipt] = useState<Receipt>({ reference: null, venues: [] });
  const started = useRef(false);
  const months = useRef(monthOptions()).current;

  const occasionTitle = EVENT_OCCASIONS.find((o) => o.value === occasion)?.title ?? 'Private event';
  const needHotelRooms = needs.includes('rooms');

  function touch() {
    if (started.current) return;
    started.current = true;
    track(ANALYTICS_EVENTS.EVENTS_BRIEF_STARTED, { occasion: occasion || undefined, venue_count: picked.length });
  }
  function toggle<T extends string>(list: T[], value: T, set: (next: T[]) => void) {
    touch();
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  const effectiveDate = dateMode === 'month' ? monthToDate(month) : preferredDate || undefined;
  const effectiveFlexible = dateMode === 'month' ? true : flexibleDates;

  const mailto = `mailto:${site.org.eventsEmail}?subject=${encodeURIComponent(`Private event brief: ${occasionTitle}`)}&body=${encodeURIComponent(
    [
      `Name: ${name}`,
      `Occasion: ${occasionTitle}`,
      `Guests: ${guests || '-'}`,
      `Date: ${effectiveDate ?? '-'}${effectiveFlexible ? ' (flexible)' : ''}`,
      `Budget: ${BUDGET_RANGES.find((b) => b.value === budget)?.label ?? '-'}`,
      `Neighborhoods: ${hoods.join(', ') || '-'}`,
      `Needs: ${needs.join(', ') || '-'}`,
      `Venues: ${picked.map((v) => v.name).join(', ') || 'suggest for me'}`,
      `Organization: ${company || '-'}`,
      `Phone: ${phone || '-'}`,
      '',
      details,
    ].join('\n'),
  )}`;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const local: Record<string, string> = {};
    const guestCount = guests.trim() ? Number(guests) : null;
    if (!occasion) local.occasion = 'Choose an occasion.';
    if (guestCount === null || !Number.isInteger(guestCount) || guestCount < 1 || guestCount > 5000) local.guests = 'How many people, roughly? A whole number up to 5,000.';
    if (dateMode === 'date' && !preferredDate) local.preferredDate = 'Pick a date, or switch to "I only know the month".';
    if (dateMode === 'month' && !monthToDate(month)) local.preferredDate = 'Pick a month.';
    if (name.trim().length < 2) local.name = 'Enter your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) local.email = 'Enter a valid work email.';
    setFieldErrors(local);
    if (Object.keys(local).length) {
      setState('idle');
      return;
    }
    setState('submitting');
    const form = e.currentTarget;
    const honeypot = (form.elements.namedItem('website') as HTMLInputElement | null)?.value ?? '';
    try {
      const res = await fetch('/api/private-events/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          company: company.trim() || null,
          phone: phone.trim() || null,
          eventType: occasionToEventType(occasion),
          occasion,
          guests: guestCount,
          preferredDate: effectiveDate ?? null,
          flexibleDates: effectiveFlexible,
          startTimeBand: startTimeBand || null,
          budget: budget || null,
          neighborhoods: hoods,
          needs,
          details: details.trim() || null,
          needHotelRooms,
          venueSlugs: picked.map((v) => v.slug),
          suggest: picked.length ? suggest : true,
          howHeard: howHeard.trim() || null,
          website: honeypot,
          sourcePath: window.location.pathname + window.location.search,
          utm: readUtm(),
          clientReference: `nsh:events:${occasion}`,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; errors?: Record<string, string>; reference?: string | null; venues?: Receipt['venues'] };
      if (res.ok && json.ok) {
        track(ANALYTICS_EVENTS.EVENTS_BRIEF_SENT, { occasion, guests_band: guestsBand(guestCount ?? undefined), venue_count: json.venues?.length ?? 0, client_reference: json.reference ?? undefined, utm: readUtm() });
        setReceipt({ reference: json.reference ?? null, venues: json.venues ?? [] });
        setState('done');
        return;
      }
      if (res.status === 400 && json.errors) {
        setFieldErrors(json.errors);
        setState('idle');
        return;
      }
      setState(res.status === 503 ? 'unavailable' : 'error');
    } catch {
      setState('error');
    }
  }

  if (state === 'done') {
    return (
      <div role="status" className="rounded-card border border-ink bg-paper p-6">
        <p className="text-[1.375rem] font-bold text-ink">Thanks, {name.trim().split(' ')[0]}. Your brief is in.</p>
        {receipt.venues.length ? (
          <>
            <p className="mt-2 max-w-prose text-[15px] text-ink-soft">
              It went to {receipt.venues.length === 1 ? 'one venue' : `${receipt.venues.length} venues`}. Each has promised a reply to {email.trim()} within {receipt.venues[0]?.slaHours ?? 24} business hours:
            </p>
            <ul className="mt-2 grid gap-1 text-[15px] text-ink">
              {receipt.venues.map((v) => (
                <li key={v.slug} className="flex flex-wrap justify-between gap-x-4 border-b border-paper-edge py-1.5">
                  <span className="font-semibold">{v.name}</span>
                  {formatDeadline(v.deadline) ? <span className="text-ink-soft">replies by {formatDeadline(v.deadline)}</span> : null}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-2 max-w-prose text-[15px] text-ink-soft">Our events desk has it and will match you by hand within one business day, replying to {email.trim()} with spaces that fit.</p>
        )}
        {receipt.reference ? (
          <p className="mt-3 text-[15px] text-ink">
            Your reference: <strong>{receipt.reference}</strong>. A copy is on its way to your inbox, with a link to add budget, neighborhoods and notes whenever you like.
          </p>
        ) : null}
        <p className="mt-3 max-w-prose text-2xs text-ink-soft">
          You confirm everything with the venue. Nashville.com is paid by the venue only if your event books, and that never changes which venues we suggest. Sending a brief does not confirm availability or a booking.
        </p>
      </div>
    );
  }

  const field = 'field-input';
  const labelClass = 'field-label';
  const err = (key: string) =>
    fieldErrors[key] ? (
      <p id={`inq-${key}-error`} role="alert" className="mt-1 text-sm text-ink">
        {fieldErrors[key]}
      </p>
    ) : null;
  const chip = (on: boolean) => `inline-flex min-h-11 cursor-pointer items-center gap-2 rounded border px-3 text-sm ${on ? 'border-ink bg-paper-sunk font-semibold text-ink' : 'border-paper-edge bg-paper text-ink'}`;

  return (
    <form onSubmit={onSubmit} onFocus={touch} noValidate aria-label="Private event brief" className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="inq-occasion" className={labelClass}>
            Occasion
          </label>
          <select id="inq-occasion" name="occasion" required value={occasion} onChange={(e) => setOccasion(e.target.value)} aria-invalid={Boolean(fieldErrors.occasion)} aria-describedby={fieldErrors.occasion ? 'inq-occasion-error' : undefined} className={field}>
            <option value="">Select an occasion</option>
            {EVENT_OCCASIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.title}
              </option>
            ))}
            <option value="other">Something else</option>
          </select>
          {err('occasion')}
        </div>
        <div>
          <label htmlFor="inq-guests" className={labelClass}>
            Guests
          </label>
          <input id="inq-guests" name="guests" type="number" min={1} max={5000} inputMode="numeric" required value={guests} onChange={(e) => setGuests(e.target.value)} placeholder="e.g. 50" aria-invalid={Boolean(fieldErrors.guests)} aria-describedby={fieldErrors.guests ? 'inq-guests-error' : undefined} className={field} />
          {err('guests')}
        </div>
        <div className="sm:col-span-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4">
            <label htmlFor={dateMode === 'date' ? 'inq-date' : 'inq-month'} className={labelClass}>
              {dateMode === 'date' ? 'Date' : 'Month'}
            </label>
            <button type="button" onClick={() => setDateMode(dateMode === 'date' ? 'month' : 'date')} className="text-sm font-semibold text-ink underline underline-offset-[0.2em]">
              {dateMode === 'date' ? 'I only know the month' : 'I have a date'}
            </button>
          </div>
          {dateMode === 'date' ? (
            <>
              <DateField id="inq-date" name="preferredDate" value={preferredDate} min={todayChicagoISO()} required onChange={setPreferredDate} aria-invalid={Boolean(fieldErrors.preferredDate)} aria-describedby={fieldErrors.preferredDate ? 'inq-preferredDate-error' : undefined} className={field} label="Open the calendar for your event date" />
              <label className="mt-2 inline-flex min-h-8 items-center gap-2 text-sm text-ink">
                <input type="checkbox" name="flexibleDates" checked={flexibleDates} onChange={(e) => setFlexibleDates(e.target.checked)} className="h-4 w-4 accent-ink" />
                A day or two either side works
              </label>
            </>
          ) : (
            <select id="inq-month" name="month" required value={month} onChange={(e) => setMonth(e.target.value)} aria-invalid={Boolean(fieldErrors.preferredDate)} aria-describedby={fieldErrors.preferredDate ? 'inq-preferredDate-error' : undefined} className={field}>
              <option value="">Select a month</option>
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          )}
          {err('preferredDate')}
        </div>
        <div>
          <label htmlFor="inq-name" className={labelClass}>
            Name
          </label>
          <input id="inq-name" name="name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? 'inq-name-error' : undefined} className={field} />
          {err('name')}
        </div>
        <div>
          <label htmlFor="inq-email" className={labelClass}>
            Work email
          </label>
          <input id="inq-email" name="email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? 'inq-email-error' : undefined} className={field} />
          {err('email')}
        </div>
      </div>

      {venuesListed ? (
        <fieldset className="rounded-card border border-paper-edge bg-paper p-4">
          <legend className="px-1 font-sans text-2xs font-bold uppercase tracking-[0.14em] text-ink">Venues</legend>
          {picked.length ? (
            <ul className="grid gap-2">
              {picked.map((v) => (
                <li key={v.slug} className="flex items-center justify-between gap-3 text-[15px] text-ink">
                  <span className="font-semibold">{v.name}</span>
                  <button type="button" onClick={() => setPicked(picked.filter((p) => p.slug !== v.slug))} className="inline-flex min-h-9 items-center text-sm text-ink-soft underline underline-offset-[0.2em] hover:text-ink">
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[15px] text-ink-soft">Nashville.com will pick up to five venues that fit. Prefer to choose? Add venues to your shortlist from their pages and come back.</p>
          )}
          {picked.length && picked.length < SHORTLIST_MAX ? (
            <label className="mt-3 inline-flex min-h-11 items-center gap-2 text-[15px] text-ink">
              <input type="checkbox" name="suggest" checked={suggest} onChange={(e) => setSuggest(e.target.checked)} className="h-4 w-4 accent-ink" />
              Let Nashville.com add venues that fit, up to {SHORTLIST_MAX} in total
            </label>
          ) : null}
          <p className="mt-2 text-2xs text-ink-soft">Suggestions are ranked by fit: capacity, minimum spend, neighborhood and what you need. Ownership, fees and sponsorship are not inputs.</p>
        </fieldset>
      ) : null}

      <div className="rounded-card border border-paper-edge bg-paper">
        <button type="button" aria-expanded={detailOpen} aria-controls="inq-detail" onClick={() => setDetailOpen(!detailOpen)} className="flex min-h-12 w-full items-center justify-between gap-3 px-4 text-left text-[15px] font-semibold text-ink">
          <span>
            Add detail <span className="font-normal text-ink-soft">(optional: budget, neighborhoods, needs, notes)</span>
          </span>
          <span aria-hidden="true">{detailOpen ? '−' : '+'}</span>
        </button>
        <div id="inq-detail" hidden={!detailOpen} className="grid gap-4 border-t border-paper-edge p-4 sm:grid-cols-2">
          <div>
            <label htmlFor="inq-budget" className={labelClass}>
              Budget range
            </label>
            <select id="inq-budget" name="budget" value={budget} onChange={(e) => setBudget(e.target.value)} className={field}>
              <option value="">Select a range</option>
              {BUDGET_RANGES.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="inq-start" className={labelClass}>
              Start time
            </label>
            <select id="inq-start" name="startTimeBand" value={startTimeBand} onChange={(e) => setStartTimeBand(e.target.value)} className={field}>
              <option value="">Not sure yet</option>
              {START_TIME_BANDS.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <p className={labelClass}>Neighborhoods you would consider</p>
            <ul className="mt-1 flex flex-wrap gap-2">
              {neighborhoods.map((n) => {
                const on = hoods.includes(n.slug);
                return (
                  <li key={n.slug}>
                    <label className={chip(on)}>
                      <input type="checkbox" name="neighborhoods" value={n.slug} checked={on} onChange={() => toggle(hoods, n.slug, setHoods)} className="sr-only" />
                      {n.name}
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="sm:col-span-2">
            <p className={labelClass}>What you need</p>
            <ul className="mt-1 flex flex-wrap gap-2">
              {NEEDS.map((n) => {
                const on = needs.includes(n.value);
                return (
                  <li key={n.value}>
                    <label className={chip(on)}>
                      <input type="checkbox" name="needs" value={n.value} checked={on} onChange={() => toggle(needs, n.value, setNeeds)} className="sr-only" />
                      {n.label}
                    </label>
                  </li>
                );
              })}
            </ul>
            {needHotelRooms ? <p className="mt-2 text-sm text-ink-soft">Our group hotels desk gets a copy and follows up on a room block separately.</p> : null}
          </div>
          <div>
            <label htmlFor="inq-company" className={labelClass}>
              Organization
            </label>
            <input id="inq-company" name="company" autoComplete="organization" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company or group" className={field} />
          </div>
          <div>
            <label htmlFor="inq-phone" className={labelClass}>
              Phone
            </label>
            <input id="inq-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="For venues that would rather call" className={field} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="inq-details" className={labelClass}>
              Notes for the venues
            </label>
            <textarea id="inq-details" name="details" rows={4} maxLength={4000} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="The shape of the evening, must-haves, anything a venue should know before replying." className={`${field} min-h-[7rem] resize-y`} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="inq-heard" className={labelClass}>
              How did you hear about us?
            </label>
            <input id="inq-heard" name="howHeard" value={howHeard} onChange={(e) => setHowHeard(e.target.value)} maxLength={120} className={field} />
          </div>
        </div>
      </div>

      {/* Honeypot: hidden from people, filled by bots. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="inq-website">Website</label>
        <input id="inq-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className="btn-primary" disabled={state === 'submitting'}>
          {state === 'submitting' ? 'Sending…' : picked.length ? `Send to ${picked.length} ${picked.length === 1 ? 'venue' : 'venues'}${suggest && picked.length < SHORTLIST_MAX ? ' and more' : ''}` : 'Send my brief'}
          <span aria-hidden="true">→</span>
        </button>
        <p className="text-2xs text-ink-soft">Sending a brief does not confirm availability or a booking. You confirm with the venue.</p>
      </div>

      {state === 'unavailable' ? (
        <p role="alert" className="rounded-card border border-ink bg-paper p-4 text-sm text-ink">
          We couldn&rsquo;t save your brief just now.{' '}
          <a href={mailto} className="font-semibold underline underline-offset-[0.2em]">
            Email the same details to {site.org.eventsEmail}
          </a>{' '}
          and a person will reply.
        </p>
      ) : null}
      {state === 'error' ? (
        <p role="alert" className="rounded-card border border-ink bg-paper p-4 text-sm text-ink">
          Something went wrong and the brief was not saved. Try again, or{' '}
          <a href={mailto} className="font-semibold underline underline-offset-[0.2em]">
            email {site.org.eventsEmail}
          </a>
          .
        </p>
      ) : null}
    </form>
  );
}
