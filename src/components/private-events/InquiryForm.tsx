'use client';

import { useRef, useState } from 'react';
import { ANALYTICS_EVENTS, track } from '@/lib/analytics';
import { neighborhoods } from '@/lib/content/neighborhoods';
import type { Need, Occasion } from '@/lib/events/types';
import { BUDGET_RANGES, EVENT_OCCASIONS, NEEDS, SHORTLIST_MAX, START_TIME_BANDS, guestsBand, occasionToEventType, type BriefPrefill } from '@/lib/private-events';
import { site } from '@/lib/site';

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
 * The brief. One form: the event, the venues (a shortlist carried in from
 * `?v=`, or "let Nashville.com suggest"), and the planner. Posts to
 * /api/private-events/, which stores the inquiry, creates one lead per venue
 * and routes each one. Success copy appears only on a confirmed response;
 * when the intake is not connected the form offers a mailto with the same
 * details instead of pretending the brief was received.
 */
export default function InquiryForm({ prefill = {}, shortlist = [], venuesListed = false }: { prefill?: BriefPrefill; shortlist?: Array<{ slug: string; name: string }>; venuesListed?: boolean }) {
  const [state, setState] = useState<State>('idle');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [occasion, setOccasion] = useState<string>(prefill.occasion ?? (prefill.type ? LEGACY_TO_OCCASION[prefill.type] : ''));
  const [guests, setGuests] = useState(prefill.guests ? String(prefill.guests) : '');
  const [preferredDate, setPreferredDate] = useState(prefill.date ?? '');
  const [flexibleDates, setFlexibleDates] = useState(Boolean(prefill.flexible));
  const [startTimeBand, setStartTimeBand] = useState('');
  const [budget, setBudget] = useState('');
  const [hoods, setHoods] = useState<string[]>([]);
  const [needs, setNeeds] = useState<Need[]>([]);
  const [details, setDetails] = useState('');
  const [picked, setPicked] = useState<Array<{ slug: string; name: string }>>(shortlist.slice(0, SHORTLIST_MAX));
  const [suggest, setSuggest] = useState(shortlist.length === 0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [howHeard, setHowHeard] = useState('');
  const [receipt, setReceipt] = useState<Receipt>({ reference: null, venues: [] });
  const started = useRef(false);

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

  const mailto = `mailto:${site.org.eventsEmail}?subject=${encodeURIComponent(`Private event brief: ${occasionTitle}`)}&body=${encodeURIComponent(
    [
      `Name: ${name}`,
      `Organization: ${company || '-'}`,
      `Phone: ${phone || '-'}`,
      `Occasion: ${occasionTitle}`,
      `Guests: ${guests || '-'}`,
      `Date: ${preferredDate || '-'}${flexibleDates ? ' (flexible)' : ''}${startTimeBand ? `, ${startTimeBand}` : ''}`,
      `Budget: ${BUDGET_RANGES.find((b) => b.value === budget)?.label ?? '-'}`,
      `Neighborhoods: ${hoods.join(', ') || '-'}`,
      `Needs: ${needs.join(', ') || '-'}`,
      `Venues: ${picked.map((v) => v.name).join(', ') || (suggest ? 'suggest for me' : '-')}`,
      '',
      details,
    ].join('\n'),
  )}`;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (!occasion) local.occasion = 'Choose an occasion.';
    if (name.trim().length < 2) local.name = 'Enter your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) local.email = 'Enter a valid work email.';
    if (!picked.length && !suggest) local.venues = 'Pick at least one venue, or let Nashville.com suggest.';
    setFieldErrors(local);
    if (Object.keys(local).length) {
      setState('idle');
      return;
    }
    setState('submitting');
    const form = e.currentTarget;
    const honeypot = (form.elements.namedItem('website') as HTMLInputElement | null)?.value ?? '';
    const guestCount = guests.trim() ? Number(guests) : null;
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
          preferredDate: preferredDate || null,
          flexibleDates,
          startTimeBand: startTimeBand || null,
          budget: budget || null,
          neighborhoods: hoods,
          needs,
          details: details.trim() || null,
          needHotelRooms,
          venueSlugs: picked.map((v) => v.slug),
          suggest,
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
          <p className="mt-2 max-w-prose text-[15px] text-ink-soft">Our events desk has it and will reply to {email.trim()} with spaces that fit.</p>
        )}
        {receipt.reference ? (
          <p className="mt-3 text-[15px] text-ink">
            Your reference: <strong>{receipt.reference}</strong>. A copy is on its way to your inbox.
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
    <form onSubmit={onSubmit} onFocus={touch} noValidate aria-label="Private event brief" className="grid gap-8">
      <fieldset className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <legend className="mb-3 font-sans text-2xs font-bold uppercase tracking-[0.14em] text-ink">1. The event</legend>
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
            Estimated guests
          </label>
          <input id="inq-guests" name="guests" type="number" min={1} max={5000} inputMode="numeric" value={guests} onChange={(e) => setGuests(e.target.value)} placeholder="e.g. 50" aria-invalid={Boolean(fieldErrors.guests)} aria-describedby={fieldErrors.guests ? 'inq-guests-error' : undefined} className={field} />
          {err('guests')}
        </div>
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
          <label htmlFor="inq-date" className={labelClass}>
            Preferred date
          </label>
          <input id="inq-date" name="preferredDate" type="date" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} aria-invalid={Boolean(fieldErrors.preferredDate)} aria-describedby={fieldErrors.preferredDate ? 'inq-preferredDate-error' : undefined} className={field} />
          {err('preferredDate')}
          <label className="mt-2 inline-flex min-h-8 items-center gap-2 text-sm text-ink">
            <input type="checkbox" name="flexibleDates" checked={flexibleDates} onChange={(e) => setFlexibleDates(e.target.checked)} className="h-4 w-4 accent-ink" />
            Flexible dates
          </label>
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
        <div className="sm:col-span-2 lg:col-span-3">
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
        <div className="sm:col-span-2 lg:col-span-3">
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
        <div className="sm:col-span-2 lg:col-span-3">
          <label htmlFor="inq-details" className={labelClass}>
            Notes for the venues
          </label>
          <textarea id="inq-details" name="details" rows={4} maxLength={4000} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="The shape of the evening, must-haves, anything a venue should know before replying." className={`${field} min-h-[7rem] resize-y`} />
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 font-sans text-2xs font-bold uppercase tracking-[0.14em] text-ink">2. Venues</legend>
        {picked.length ? (
          <ul className="grid gap-2">
            {picked.map((v) => (
              <li key={v.slug} className="flex items-center justify-between gap-3 rounded border border-paper-edge bg-paper px-3 py-2 text-[15px] text-ink">
                <span className="font-semibold">{v.name}</span>
                <button type="button" onClick={() => setPicked(picked.filter((p) => p.slug !== v.slug))} className="inline-flex min-h-9 items-center text-sm text-ink-soft underline underline-offset-[0.2em] hover:text-ink">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[15px] text-ink-soft">
            No shortlist yet. {venuesListed ? 'Browse the venues above and add up to five, or let Nashville.com pick for fit.' : 'Nashville.com will match your brief by hand until the first venues are published.'}
          </p>
        )}
        {picked.length < SHORTLIST_MAX ? (
          <label className="mt-3 inline-flex min-h-11 items-center gap-2 text-[15px] text-ink">
            <input type="checkbox" name="suggest" checked={suggest} onChange={(e) => setSuggest(e.target.checked)} className="h-4 w-4 accent-ink" />
            {picked.length ? `Let Nashville.com add venues that fit, up to ${SHORTLIST_MAX} in total` : 'Let Nashville.com suggest up to five venues that fit'}
          </label>
        ) : null}
        {err('venues')}
        <p className="mt-2 text-2xs text-ink-soft">Suggestions are ranked by fit: capacity, minimum spend, neighborhood and what you need. Ownership, fees and sponsorship are not inputs.</p>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-sans text-2xs font-bold uppercase tracking-[0.14em] text-ink">3. You</legend>
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
        <div>
          <label htmlFor="inq-company" className={labelClass}>
            Organization <span className="font-normal text-ink-soft">(optional)</span>
          </label>
          <input id="inq-company" name="company" autoComplete="organization" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company or group" className={field} />
        </div>
        <div>
          <label htmlFor="inq-phone" className={labelClass}>
            Phone <span className="font-normal text-ink-soft">(optional)</span>
          </label>
          <input id="inq-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="For venues that would rather call" className={field} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="inq-heard" className={labelClass}>
            How did you hear about us? <span className="font-normal text-ink-soft">(optional)</span>
          </label>
          <input id="inq-heard" name="howHeard" value={howHeard} onChange={(e) => setHowHeard(e.target.value)} maxLength={120} className={field} />
        </div>
      </fieldset>

      {/* Honeypot: hidden from people, filled by bots. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="inq-website">Website</label>
        <input id="inq-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className="btn-primary" disabled={state === 'submitting'}>
          {state === 'submitting' ? 'Sending…' : picked.length ? `Send to ${picked.length} ${picked.length === 1 ? 'venue' : 'venues'}${suggest ? ' and more' : ''}` : 'Send my brief'}
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
