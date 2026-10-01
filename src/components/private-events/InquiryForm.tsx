'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import DateField from '@/components/DateField';
import { ANALYTICS_EVENTS, track } from '@/lib/analytics';
import { neighborhoodName, neighborhoods } from '@/lib/content/neighborhoods';
import { PREVIEW_NOT_SENT } from '@/lib/events/delivery';
import { ANY_AREA, FINDER_EVENT_TYPES, MAX_PRIORITIES, PRIORITIES, finderEventType, finderParams, isPriority, maxGuestsFor, prioritiesToNeeds, priorityLabel, type Priority } from '@/lib/events/finder';
import { BUDGET_RANGES, SHORTLIST_MAX, START_TIME_BANDS, formatBriefDate, guestsBand, monthOptions, monthToDate, occasionToEventType, sizeBandBySlug, type BriefPrefill } from '@/lib/private-events';
import { todayChicagoISO } from '@/lib/stay-dates';

type Step = 'edit' | 'review' | 'submitting' | 'done' | 'unavailable' | 'error';
type Receipt = { reference: string | null; statusPath?: string; preview?: boolean; venues: Array<{ slug: string; name: string; slaHours?: number; deadline?: string }> };
type Flex = 'exact' | 'nearby' | 'month';

const FLEX_LABEL: Record<Flex, string> = { exact: 'This date only', nearby: 'A few days either side works', month: 'Flexible within the month' };

export interface VenueBooked {
  /** Months (YYYY-MM) and days (YYYY-MM-DD) where the venue said every space is booked. */
  months: string[];
  days: string[];
}

/** The finder event type for a prefill, falling back from a legacy `?occasion=` or `?type=`. */
function eventFromPrefill(prefill: BriefPrefill): string {
  if (prefill.event && finderEventType(prefill.event)) return prefill.event;
  const occasion = prefill.occasion ?? prefill.type;
  return FINDER_EVENT_TYPES.find((t) => t.occasion === occasion && t.value !== 'offsite')?.value ?? '';
}

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

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FIRST_FIELD: Record<string, string> = { event: 'inq-event', guests: 'inq-guests', preferredDate: 'inq-date', startTimeBand: 'inq-start', budget: 'inq-budget', name: 'inq-name', email: 'inq-email', company: 'inq-company' };

/**
 * The brief: a qualified inquiry in two steps. Edit collects the event
 * (type, exact guest count, date and flexibility, time of day, budget,
 * area, priorities), the planner (name, work email, company or group) and
 * the optional details (phone, convention or hotel, backup dates,
 * requirements); Review shows the complete brief with an Edit control on
 * every group before anything is sent. Finder selections arrive in
 * `prefill` and stay editable here. Posts to /api/private-events/; on a
 * build where delivery is off the server answers with a preview receipt
 * and the form says so plainly.
 */
export default function InquiryForm({ prefill = {}, shortlist = [], venuesListed = false, booked = {}, delivery = true }: { prefill?: BriefPrefill; shortlist?: Array<{ slug: string; name: string }>; venuesListed?: boolean; booked?: Record<string, VenueBooked>; delivery?: boolean }) {
  const [step, setStep] = useState<Step>('edit');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [event, setEvent] = useState<string>(eventFromPrefill(prefill));
  const [guests, setGuests] = useState(prefill.guests ? String(prefill.guests) : '');
  const [dateMode, setDateMode] = useState<'date' | 'month'>('date');
  const [preferredDate, setPreferredDate] = useState(prefill.date ?? '');
  const [month, setMonth] = useState('');
  const [flex, setFlex] = useState<Flex>(prefill.flexible ? 'nearby' : 'exact');
  const [startTimeBand, setStartTimeBand] = useState('');
  const [budget, setBudget] = useState('');
  const [area, setArea] = useState<string>(prefill.area && (prefill.area === ANY_AREA || neighborhoods.some((n) => n.slug === prefill.area)) ? prefill.area : ANY_AREA);
  const [priorities, setPriorities] = useState<Priority[]>((prefill.priorities ?? []).filter(isPriority).slice(0, MAX_PRIORITIES));
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [conventionOrHotel, setConventionOrHotel] = useState('');
  const [backupDates, setBackupDates] = useState('');
  const [requirements, setRequirements] = useState('');
  const [picked, setPicked] = useState<Array<{ slug: string; name: string }>>(shortlist.slice(0, SHORTLIST_MAX));
  const [suggest, setSuggest] = useState(true);
  const [receipt, setReceipt] = useState<Receipt>({ reference: null, venues: [] });
  const [focusAfterEdit, setFocusAfterEdit] = useState<string | null>(null);
  const started = useRef(false);
  const reviewRef = useRef<HTMLDivElement>(null);
  const months = useRef(monthOptions()).current;

  const eventDef = finderEventType(event);
  const occasion = eventDef?.occasion ?? '';
  const eventLabel = eventDef?.label ?? 'Private event';
  const sizeHint = prefill.size ? sizeBandBySlug(prefill.size) : undefined;
  const typeMax = maxGuestsFor(eventDef?.value);
  const when = dateMode === 'date' ? preferredDate : month;
  const effectiveDate = dateMode === 'month' ? monthToDate(month) : preferredDate || undefined;
  const effectiveFlexible = dateMode === 'month' ? true : flex !== 'exact';
  const flexLabel = dateMode === 'month' ? 'Any date in the month' : FLEX_LABEL[flex];
  const isBooked = (slug: string) => {
    const b = booked[slug];
    if (!b || !when) return false;
    return when.length === 7 ? b.months.includes(when) : b.days.includes(when) || b.months.includes(when.slice(0, 7));
  };
  const sendable = picked.filter((v) => !isBooked(v.slug));
  const needs = prioritiesToNeeds(priorities);
  const hoods = area !== ANY_AREA ? [area] : [];
  const summary = { eventLabel, guests, effectiveDate, effectiveFlexible, flexLabel, startTimeBand, budget, area, priorities, name, email, company, phone, conventionOrHotel, backupDates, requirements, picked: sendable, suggest, venuesListed };

  function touch() {
    if (started.current) return;
    started.current = true;
    track(ANALYTICS_EVENTS.EVENTS_BRIEF_STARTED, { occasion: occasion || undefined, venue_count: picked.length });
  }
  function togglePriority(p: Priority) {
    touch();
    setPriorities((list) => (list.includes(p) ? list.filter((x) => x !== p) : list.length >= MAX_PRIORITIES ? list : [...list, p]));
  }

  // After "Edit" on the review, land on the field the planner asked for; on review, move focus to its heading.
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (step === 'edit' && focusAfterEdit) {
      const el = document.getElementById(focusAfterEdit);
      el?.focus({ preventScroll: true });
      el?.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
      setFocusAfterEdit(null);
    }
    if (step === 'review') {
      reviewRef.current?.focus({ preventScroll: true });
      reviewRef.current?.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
    }
  }, [step, focusAfterEdit]);

  function validate(): Record<string, string> {
    const local: Record<string, string> = {};
    const guestCount = guests.trim() ? Number(guests) : null;
    const today = todayChicagoISO();
    if (!eventDef) local.event = 'Choose an event type.';
    if (guestCount === null || !Number.isInteger(guestCount) || guestCount < 1 || guestCount > 5000) local.guests = 'Enter the expected guest count: a whole number from 1 to 5,000.';
    if (dateMode === 'date') {
      if (!preferredDate) local.preferredDate = 'Pick a date, or switch to "I only know the month".';
      else if (!/^\d{4}-\d{2}-\d{2}$/.test(preferredDate) || Number.isNaN(Date.parse(preferredDate))) local.preferredDate = 'Use a valid date.';
      else if (preferredDate < today) local.preferredDate = 'Pick a date from today on.';
    }
    if (dateMode === 'month') {
      const first = monthToDate(month);
      if (!first || first < `${today.slice(0, 7)}-01`) local.preferredDate = 'Pick a month from this one on.';
    }
    if (!startTimeBand) local.startTimeBand = 'Choose a time of day.';
    if (!budget) local.budget = 'Choose a budget range, or "Need guidance".';
    if (name.trim().length < 2) local.name = 'Enter your name.';
    if (!EMAIL.test(email.trim())) local.email = 'Enter a valid work email.';
    if (company.trim().length < 2) local.company = 'Enter your company or group.';
    return local;
  }

  function onReview(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const local = validate();
    setFieldErrors(local);
    if (Object.keys(local).length) {
      const first = Object.keys(FIRST_FIELD).find((k) => local[k]);
      if (first) document.getElementById(dateMode === 'month' && first === 'preferredDate' ? 'inq-month' : FIRST_FIELD[first])?.focus();
      return;
    }
    setStep('review');
  }

  function edit(fieldId: string) {
    setFocusAfterEdit(fieldId);
    setStep('edit');
  }

  /** Everything the inquiry row has no column for goes in the planner's notes, labeled. */
  function composeDetails(): string | null {
    const lines = [
      eventDef && eventDef.value !== eventDef.occasion ? `Format: ${eventDef.label}` : '',
      priorities.length ? `Priorities: ${priorities.map(priorityLabel).join(', ')}` : '',
      `Date flexibility: ${flexLabel}`,
      conventionOrHotel.trim() ? `Convention or hotel: ${conventionOrHotel.trim()}` : '',
      backupDates.trim() ? `Backup dates: ${backupDates.trim()}` : '',
      requirements.trim() ? `Requirements:\n${requirements.trim()}` : '',
    ].filter(Boolean);
    return lines.length ? lines.join('\n') : null;
  }

  async function onSend() {
    const local = validate();
    setFieldErrors(local);
    if (Object.keys(local).length) {
      setStep('edit');
      return;
    }
    setStep('submitting');
    const guestCount = Number(guests);
    const honeypot = (document.getElementById('inq-website') as HTMLInputElement | null)?.value ?? '';
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
          details: composeDetails(),
          needHotelRooms: false,
          venueSlugs: sendable.map((v) => v.slug),
          suggest: picked.length ? suggest : true,
          website: honeypot,
          sourcePath: window.location.pathname + window.location.search,
          utm: readUtm(),
          clientReference: `nsh:events:${occasion}`,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; preview?: boolean; error?: string; errors?: Record<string, string>; reference?: string | null; statusPath?: string; venues?: Receipt['venues'] };
      if (res.ok && json.ok) {
        if (!json.preview) track(ANALYTICS_EVENTS.EVENTS_BRIEF_SENT, { occasion, guests_band: guestsBand(guestCount), venue_count: json.venues?.length ?? 0, client_reference: json.reference ?? undefined, utm: readUtm() });
        setReceipt({ reference: json.reference ?? null, statusPath: json.statusPath, preview: Boolean(json.preview), venues: json.venues ?? [] });
        setStep('done');
        return;
      }
      if (res.status === 400 && json.errors) {
        setFieldErrors(json.errors);
        setStep('edit');
        return;
      }
      setStep(res.status === 503 ? 'unavailable' : 'error');
    } catch {
      setStep('error');
    }
  }

  const finderHref = `/private-events/?${finderParams({ eventType: eventDef?.value, size: prefill.size, area, priorities }).toString()}#plan`;

  if (step === 'done') {
    const first = name.trim().split(' ')[0];
    if (receipt.preview) {
      return (
        <div role="status" className="rounded-card border-2 border-dashed border-ink bg-paper-sunk p-6">
          <p className="eyebrow">Private preview</p>
          <p className="mt-1 text-[1.375rem] font-bold text-ink">Reviewed, not sent.</p>
          <p className="mt-2 max-w-prose text-[15px] text-ink">
            {PREVIEW_NOT_SENT} On the live site this brief would go to {sendable.length ? `${sendable.length} ${sendable.length === 1 ? 'venue' : 'venues'}` : 'up to five matched venues'} and to the events desk, and {first} would get a confirmation at {email.trim()}.
          </p>
          <div className="mt-4">
            <BriefSummary {...summary} />
          </div>
          <p className="mt-4 text-sm">
            <Link href={finderHref} className="font-semibold text-ink underline underline-offset-[0.2em]">
              Back to the finder with these choices
            </Link>
          </p>
        </div>
      );
    }
    return (
      <div role="status" className="rounded-card border border-ink bg-paper p-6">
        <p className="text-[1.375rem] font-bold text-ink">Thanks, {first}. Your brief is in.</p>
        {receipt.venues.length ? (
          <>
            <p className="mt-2 max-w-prose text-[15px] text-ink-soft">
              It went to {receipt.venues.length === 1 ? 'one venue' : `${receipt.venues.length} venues`}. Each replies to {email.trim()} directly, by the time shown:
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
            Your reference: <strong>{receipt.reference}</strong>. A copy is on its way to your inbox, with a link to add detail whenever you like.
          </p>
        ) : null}
        {receipt.statusPath ? (
          <p className="mt-3">
            <Link href={receipt.statusPath} className="btn-secondary">
              Watch replies come in
              <span aria-hidden="true">→</span>
            </Link>
          </p>
        ) : null}
        <p className="mt-3 max-w-prose text-2xs text-ink-soft">You confirm everything with the venue. Nashville.com is paid by the venue only if your event books, and that never changes which venues we suggest. Sending a brief does not confirm availability or a booking.</p>
      </div>
    );
  }

  const field = 'field-input';
  const labelClass = 'field-label';
  const err = (key: string) =>
    fieldErrors[key] ? (
      <p id={`inq-${key}-error`} role="alert" className="mt-1 text-sm font-semibold text-ink">
        {fieldErrors[key]}
      </p>
    ) : null;
  const invalid = (key: string) => ({ 'aria-invalid': Boolean(fieldErrors[key]) || undefined, 'aria-describedby': fieldErrors[key] ? `inq-${key}-error` : undefined });
  const chip = (on: boolean, disabled: boolean) => `inline-flex min-h-11 cursor-pointer items-center gap-2 rounded border px-3 text-sm focus-within:ring-2 focus-within:ring-ink focus-within:ring-offset-2 focus-within:ring-offset-paper ${on ? 'border-ink bg-ink font-semibold text-paper' : disabled ? 'cursor-not-allowed border-paper-edge text-ink-faint' : 'border-paper-edge bg-paper text-ink hover:border-ink'}`;
  const promoted = FINDER_EVENT_TYPES.filter((t) => t.promoted);
  const secondary = FINDER_EVENT_TYPES.filter((t) => !t.promoted);
  const legend = 'px-1 font-sans text-2xs font-bold uppercase tracking-[0.14em] text-ink';
  const required = <span className="font-normal text-ink-soft">(required)</span>;

  if (step !== 'edit') {
    return (
      <div ref={reviewRef} tabIndex={-1} className="grid gap-6 scroll-mt-24 outline-none" aria-labelledby="review-title">
        <div>
          <p className="eyebrow">Step 2 of 2</p>
          <h2 id="review-title" className="mt-1 font-display text-[1.75rem] font-extrabold tracking-[-0.03em] text-ink">
            Review your brief.
          </h2>
          <p className="mt-2 max-w-prose text-[15px] text-ink-soft">This is exactly what {sendable.length ? 'the venues' : 'the events desk'} will receive. Change anything with Edit; nothing is sent until you select the button at the bottom.</p>
        </div>
        <BriefSummary {...summary} onEdit={edit} />
        {!delivery ? (
          <p role="note" className="rounded border-2 border-dashed border-ink bg-paper-sunk px-4 py-3 text-sm text-ink">
            <strong className="font-semibold">Private preview.</strong> {PREVIEW_NOT_SENT}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" onClick={onSend} className="btn-primary" disabled={step === 'submitting'}>
            {step === 'submitting' ? 'Sending…' : sendable.length ? `Send to ${sendable.length} ${sendable.length === 1 ? 'venue' : 'venues'}${suggest && sendable.length < SHORTLIST_MAX ? ' and more' : ''}` : 'Send my brief'}
            <span aria-hidden="true">→</span>
          </button>
          <button type="button" onClick={() => edit('inq-event')} className="inline-flex min-h-11 items-center text-[15px] font-semibold text-ink underline underline-offset-[0.2em]">
            Back to edit
          </button>
          <p className="text-2xs text-ink-soft">Sending a brief does not confirm availability or a booking. You confirm with the venue.</p>
        </div>
        {step === 'unavailable' ? (
          <p role="alert" className="rounded-card border border-ink bg-paper p-4 text-sm text-ink">
            We couldn&rsquo;t save your brief just now. Try again in a minute; nothing was sent.
          </p>
        ) : null}
        {step === 'error' ? (
          <p role="alert" className="rounded-card border border-ink bg-paper p-4 text-sm text-ink">
            Something went wrong and the brief was not saved. Try again; nothing was sent.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={onReview} onFocus={touch} noValidate aria-label="Private event brief" className="grid gap-6">
      <div>
        <p className="eyebrow">Step 1 of 2</p>
        <p className="mt-1 text-[15px] text-ink-soft">Required fields are what venues need to answer. You review everything before it is sent.</p>
      </div>

      <fieldset className="grid gap-4 rounded-card border border-paper-edge bg-paper p-4 sm:grid-cols-2 sm:p-5">
        <legend className={legend}>The event</legend>
        <div>
          <label htmlFor="inq-event" className={labelClass}>
            Event type {required}
          </label>
          <select id="inq-event" name="event" required value={event} onChange={(e) => setEvent(e.target.value)} {...invalid('event')} className={field}>
            <option value="">Select an event type</option>
            <optgroup label="Most common">
              {promoted.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Other occasions">
              {secondary.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </optgroup>
          </select>
          {err('event')}
        </div>
        <div>
          <label htmlFor="inq-guests" className={labelClass}>
            Expected guest count {required}
          </label>
          <input id="inq-guests" name="guests" type="number" min={1} max={5000} inputMode="numeric" required value={guests} onChange={(e) => setGuests(e.target.value)} placeholder={sizeHint ? `e.g. ${Number.isFinite(sizeHint.max) ? Math.round((sizeHint.min + sizeHint.max) / 2) : sizeHint.min + 50}` : 'e.g. 60'} {...invalid('guests')} className={field} />
          {sizeHint ? <p className="mt-1 text-2xs text-ink-soft">You chose {sizeHint.label.toLowerCase()} guests in the finder; the exact number helps venues quote.</p> : null}
          {typeMax && Number(guests) > typeMax ? <p className="mt-1 text-2xs text-ink-soft">That is larger than a {eventLabel.toLowerCase()} usually runs (up to {typeMax}). Fine if it is right; otherwise Corporate event or Something else may fit better.</p> : null}
          {err('guests')}
        </div>
        <div className="sm:col-span-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4">
            <label htmlFor={dateMode === 'date' ? 'inq-date' : 'inq-month'} className={labelClass}>
              {dateMode === 'date' ? 'Preferred date' : 'Preferred month'} {required}
            </label>
            <button type="button" onClick={() => setDateMode(dateMode === 'date' ? 'month' : 'date')} className="min-h-9 text-sm font-semibold text-ink underline underline-offset-[0.2em]">
              {dateMode === 'date' ? 'I only know the month' : 'I have a date'}
            </button>
          </div>
          {dateMode === 'date' ? (
            <DateField id="inq-date" name="preferredDate" value={preferredDate} min={todayChicagoISO()} required onChange={setPreferredDate} aria-invalid={Boolean(fieldErrors.preferredDate)} aria-describedby={fieldErrors.preferredDate ? 'inq-preferredDate-error' : undefined} className={field} label="Open the calendar for your event date" />
          ) : (
            <select id="inq-month" name="month" required value={month} onChange={(e) => setMonth(e.target.value)} {...invalid('preferredDate')} className={field}>
              <option value="">Select a month</option>
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          )}
          {err('preferredDate')}
          {dateMode === 'date' ? (
            <fieldset className="mt-3">
              <legend className="text-sm font-semibold text-ink">Flexibility</legend>
              <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1">
                {(Object.keys(FLEX_LABEL) as Flex[]).map((f) => (
                  <label key={f} className="inline-flex min-h-9 items-center gap-2 text-sm text-ink">
                    <input type="radio" name="flex" value={f} checked={flex === f} onChange={() => setFlex(f)} className="h-4 w-4 accent-ink" />
                    {FLEX_LABEL[f]}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : (
            <p className="mt-2 text-sm text-ink-soft">Any date in that month works; name preferred weekdays under backup dates below if you have them.</p>
          )}
        </div>
        <div>
          <label htmlFor="inq-start" className={labelClass}>
            Time of day {required}
          </label>
          <select id="inq-start" name="startTimeBand" required value={startTimeBand} onChange={(e) => setStartTimeBand(e.target.value)} {...invalid('startTimeBand')} className={field}>
            <option value="">Select a time of day</option>
            {START_TIME_BANDS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
          {err('startTimeBand')}
        </div>
        <div>
          <label htmlFor="inq-budget" className={labelClass}>
            Total event budget {required}
          </label>
          <select id="inq-budget" name="budget" required value={budget} onChange={(e) => setBudget(e.target.value)} {...invalid('budget')} className={field}>
            <option value="">Select a range</option>
            {BUDGET_RANGES.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
          {err('budget')}
        </div>
        <div>
          <label htmlFor="inq-area" className={labelClass}>
            Preferred area
          </label>
          <select id="inq-area" name="area" value={area} onChange={(e) => setArea(e.target.value)} className={field}>
            <option value={ANY_AREA}>Open to the best fit</option>
            {neighborhoods.map((n) => (
              <option key={n.slug} value={n.slug}>
                {n.name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <p id="inq-priorities-label" className={labelClass}>
            Priorities <span className="font-normal text-ink-soft">(up to {MAX_PRIORITIES})</span>
          </p>
          <ul className="flex flex-wrap gap-2" aria-labelledby="inq-priorities-label">
            {PRIORITIES.map((p) => {
              const on = priorities.includes(p.value);
              const disabled = !on && priorities.length >= MAX_PRIORITIES;
              return (
                <li key={p.value}>
                  <label className={chip(on, disabled)}>
                    <input type="checkbox" name="priorities" value={p.value} checked={on} disabled={disabled} onChange={() => togglePriority(p.value)} className="sr-only" />
                    <span aria-hidden="true">{on ? '✓' : '+'}</span>
                    {p.label}
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      </fieldset>

      <fieldset className="grid gap-4 rounded-card border border-paper-edge bg-paper p-4 sm:grid-cols-2 sm:p-5">
        <legend className={legend}>You</legend>
        <div>
          <label htmlFor="inq-name" className={labelClass}>
            Name {required}
          </label>
          <input id="inq-name" name="name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" {...invalid('name')} className={field} />
          {err('name')}
        </div>
        <div>
          <label htmlFor="inq-email" className={labelClass}>
            Work email {required}
          </label>
          <input id="inq-email" name="email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" {...invalid('email')} className={field} />
          {err('email')}
        </div>
        <div>
          <label htmlFor="inq-company" className={labelClass}>
            Company or group {required}
          </label>
          <input id="inq-company" name="company" autoComplete="organization" required value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company, association or group" {...invalid('company')} className={field} />
          {err('company')}
        </div>
        <div>
          <label htmlFor="inq-phone" className={labelClass}>
            Phone <span className="font-normal text-ink-soft">(optional)</span>
          </label>
          <input id="inq-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="For venues that would rather call" className={field} />
        </div>
      </fieldset>

      <fieldset className="grid gap-4 rounded-card border border-paper-edge bg-paper p-4 sm:grid-cols-2 sm:p-5">
        <legend className={legend}>Helpful detail (optional)</legend>
        <div>
          <label htmlFor="inq-convention" className={labelClass}>
            Convention or hotel
          </label>
          <input id="inq-convention" name="conventionOrHotel" value={conventionOrHotel} onChange={(e) => setConventionOrHotel(e.target.value)} maxLength={160} placeholder="The conference, or where the group is staying" className={field} />
        </div>
        <div>
          <label htmlFor="inq-backup" className={labelClass}>
            Backup dates
          </label>
          <input id="inq-backup" name="backupDates" value={backupDates} onChange={(e) => setBackupDates(e.target.value)} maxLength={160} placeholder="e.g. Dec 5, or any Thursday in December" className={field} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="inq-requirements" className={labelClass}>
            Additional requirements
          </label>
          <textarea id="inq-requirements" name="requirements" rows={4} maxLength={3000} value={requirements} onChange={(e) => setRequirements(e.target.value)} placeholder="The shape of the evening, must-haves, accessibility, dietary needs, anything a venue should know before replying." className={`${field} min-h-[7rem] resize-y`} />
        </div>
      </fieldset>

      {venuesListed ? (
        <fieldset className="rounded-card border border-paper-edge bg-paper p-4 sm:p-5">
          <legend className={legend}>Venues</legend>
          {picked.length ? (
            <ul className="grid gap-2">
              {picked.map((v) => (
                <li key={v.slug} className={`flex items-center justify-between gap-3 text-[15px] ${isBooked(v.slug) ? 'text-ink-soft' : 'text-ink'}`}>
                  <span className={isBooked(v.slug) ? 'line-through decoration-ink-soft' : 'font-semibold'}>
                    {v.name}
                    {isBooked(v.slug) ? <span className="ml-2 text-2xs font-semibold uppercase tracking-[0.14em] no-underline">Booked then, per the venue; not sent</span> : null}
                  </span>
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
          <p className="mt-2 text-2xs text-ink-soft">Suggestions are ranked by fit: capacity, price band, area and what you need. Ownership, fees and sponsorship are not inputs.</p>
        </fieldset>
      ) : null}

      {/* Honeypot: hidden from people, filled by bots. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="inq-website">Website</label>
        <input id="inq-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className="btn-primary">
          Review my brief
          <span aria-hidden="true">→</span>
        </button>
        <p className="text-2xs text-ink-soft">Nothing is sent at this step.</p>
      </div>
    </form>
  );
}

interface SummaryProps {
  eventLabel: string;
  guests: string;
  effectiveDate?: string;
  effectiveFlexible: boolean;
  flexLabel: string;
  startTimeBand: string;
  budget: string;
  area: string;
  priorities: Priority[];
  name: string;
  email: string;
  company: string;
  phone: string;
  conventionOrHotel: string;
  backupDates: string;
  requirements: string;
  picked: Array<{ slug: string; name: string }>;
  suggest: boolean;
  venuesListed: boolean;
  onEdit?: (fieldId: string) => void;
}

/** The complete brief as definition lists, with an Edit control per group when editing is allowed. */
function BriefSummary(p: SummaryProps) {
  const groups: Array<{ title: string; field: string; rows: Array<[string, string]> }> = [
    {
      title: 'The event',
      field: 'inq-event',
      rows: [
        ['Event type', p.eventLabel],
        ['Guests', p.guests ? `${Number(p.guests).toLocaleString('en-US')} expected` : 'not set'],
        ['Date', `${formatBriefDate(p.effectiveDate, p.effectiveFlexible)} · ${p.flexLabel}`],
        ['Time of day', START_TIME_BANDS.find((b) => b.value === p.startTimeBand)?.label ?? 'not set'],
        ['Budget', BUDGET_RANGES.find((b) => b.value === p.budget)?.label ?? 'not set'],
        ['Area', p.area === ANY_AREA ? 'Open to the best fit' : neighborhoodName(p.area)],
        ['Priorities', p.priorities.length ? p.priorities.map(priorityLabel).join(', ') : 'none chosen'],
      ],
    },
    {
      title: 'You',
      field: 'inq-name',
      rows: [
        ['Name', p.name],
        ['Work email', p.email],
        ['Company or group', p.company],
        ['Phone', p.phone || 'not given'],
      ],
    },
    {
      title: 'Helpful detail',
      field: 'inq-convention',
      rows: [
        ['Convention or hotel', p.conventionOrHotel || 'not given'],
        ['Backup dates', p.backupDates || 'none'],
        ['Requirements', p.requirements || 'none'],
      ],
    },
  ];
  if (p.venuesListed) {
    groups.push({ title: 'Venues', field: 'inq-event', rows: [['Goes to', p.picked.length ? `${p.picked.map((v) => v.name).join(', ')}${p.suggest && p.picked.length < SHORTLIST_MAX ? ', plus venues Nashville.com matches' : ''}` : 'Up to five venues Nashville.com matches on fit']] });
  }
  return (
    <div className="grid gap-4">
      {groups.map((g) => (
        <section key={g.title} aria-label={g.title} className="rounded-card border border-paper-edge bg-paper p-4 sm:p-5">
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-sans text-2xs font-bold uppercase tracking-[0.14em] text-ink">{g.title}</h3>
            {p.onEdit ? (
              <button type="button" onClick={() => p.onEdit?.(g.field)} className="inline-flex min-h-9 items-center text-sm font-semibold text-ink underline underline-offset-[0.2em]">
                Edit<span className="sr-only"> {g.title.toLowerCase()}</span>
              </button>
            ) : null}
          </div>
          <dl className="mt-2 grid gap-x-6 gap-y-1.5 text-[15px] sm:grid-cols-[160px_minmax(0,1fr)]">
            {g.rows.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-ink-soft">{k}</dt>
                <dd className="whitespace-pre-line text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
