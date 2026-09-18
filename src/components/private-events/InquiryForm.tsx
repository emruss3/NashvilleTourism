'use client';

import { useState } from 'react';
import { ANALYTICS_EVENTS, track } from '@/lib/analytics';
import { BUDGET_RANGES, EVENT_TYPES, type BriefPrefill } from '@/lib/private-events';
import { site } from '@/lib/site';

type State = 'idle' | 'submitting' | 'done' | 'unavailable' | 'error';

/**
 * Full inquiry form ("Let's plan your event."). Posts to /api/private-events/,
 * which stores the row; success copy appears only on a confirmed response.
 * When the intake is not connected the form offers a mailto with the same
 * details instead of pretending the inquiry was received.
 */
export default function InquiryForm({ prefill = {} }: { prefill?: BriefPrefill }) {
  const [state, setState] = useState<State>('idle');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [eventType, setEventType] = useState<string>(prefill.type ?? '');
  const [guests, setGuests] = useState(prefill.guests ? String(prefill.guests) : '');
  const [preferredDate, setPreferredDate] = useState(prefill.date ?? '');
  const [flexibleDates, setFlexibleDates] = useState(Boolean(prefill.flexible));
  const [budget, setBudget] = useState('');
  const [details, setDetails] = useState('');
  const [needHotelRooms, setNeedHotelRooms] = useState(false);

  const typeLabel = EVENT_TYPES.find((t) => t.value === eventType)?.label ?? 'Private event';
  const mailto = `mailto:${site.org.email}?subject=${encodeURIComponent(`Private event inquiry: ${typeLabel}`)}&body=${encodeURIComponent(
    [
      `Name: ${name}`,
      `Company: ${company || '-'}`,
      `Event type: ${typeLabel}`,
      `Estimated guests: ${guests || '-'}`,
      `Preferred date: ${preferredDate || '-'}${flexibleDates ? ' (flexible)' : ''}`,
      `Budget: ${BUDGET_RANGES.find((b) => b.value === budget)?.label ?? '-'}`,
      `Hotel rooms needed: ${needHotelRooms ? 'yes' : 'no'}`,
      '',
      details,
    ].join('\n'),
  )}`;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (name.trim().length < 2) local.name = 'Enter your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) local.email = 'Enter a valid work email.';
    if (!eventType) local.eventType = 'Choose an event type.';
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
          eventType,
          guests: guests.trim() ? Number(guests) : null,
          preferredDate: preferredDate || null,
          flexibleDates,
          budget: budget || null,
          details: details.trim() || null,
          needHotelRooms,
          website: honeypot,
          sourcePath: window.location.pathname + window.location.search,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; errors?: Record<string, string> };
      if (res.ok && json.ok) {
        track(ANALYTICS_EVENTS.EVENT_INQUIRY_SUBMITTED, { item_type: eventType, value: guests.trim() ? Number(guests) : undefined });
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
        <p className="text-[1.375rem] font-bold text-ink">Thanks, {name.trim().split(' ')[0]}. Your inquiry is in.</p>
        <p className="mt-2 max-w-prose text-[15px] text-ink-soft">
          The events desk will reply to {email.trim()} within three business days with spaces that fit. Submitting an inquiry does not
          confirm availability or a booking.
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

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Private event inquiry" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          Company <span className="font-normal text-ink-soft">(optional)</span>
        </label>
        <input id="inq-company" name="company" autoComplete="organization" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company name" className={field} />
      </div>

      <div>
        <label htmlFor="inq-type" className={labelClass}>
          Event type
        </label>
        <select id="inq-type" name="eventType" required value={eventType} onChange={(e) => setEventType(e.target.value)} aria-invalid={Boolean(fieldErrors.eventType)} aria-describedby={fieldErrors.eventType ? 'inq-eventType-error' : undefined} className={field}>
          <option value="">Select event type</option>
          {EVENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        {err('eventType')}
      </div>
      <div>
        <label htmlFor="inq-guests" className={labelClass}>
          Estimated guests
        </label>
        <input id="inq-guests" name="guests" type="number" min={1} max={5000} inputMode="numeric" value={guests} onChange={(e) => setGuests(e.target.value)} placeholder="e.g. 50" aria-invalid={Boolean(fieldErrors.guests)} aria-describedby={fieldErrors.guests ? 'inq-guests-error' : undefined} className={field} />
        {err('guests')}
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
      <div className="sm:col-span-2">
        <label htmlFor="inq-details" className={labelClass}>
          Event details
        </label>
        <textarea id="inq-details" name="details" rows={4} maxLength={4000} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Tell us about your event, your goals, and any special requests…" className={`${field} min-h-[7rem] resize-y`} />
      </div>

      {/* Honeypot: hidden from people, filled by bots. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="inq-website">Website</label>
        <input id="inq-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex items-center">
        <label className="inline-flex min-h-11 items-center gap-2 text-sm text-ink">
          <input type="checkbox" name="needHotelRooms" checked={needHotelRooms} onChange={(e) => setNeedHotelRooms(e.target.checked)} className="h-4 w-4 accent-ink" />
          Need hotel rooms
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <button type="submit" className="btn-primary" disabled={state === 'submitting'}>
          {state === 'submitting' ? 'Sending…' : 'Send event inquiry'}
          <span aria-hidden="true">→</span>
        </button>
        <p className="text-2xs text-ink-soft">Submitting an inquiry does not confirm availability or a booking.</p>
      </div>

      {state === 'unavailable' ? (
        <p role="alert" className="rounded-card border border-ink bg-paper-sunk p-4 text-sm text-ink sm:col-span-2 lg:col-span-3">
          We couldn&rsquo;t save your inquiry just now.{' '}
          <a href={mailto} className="font-semibold underline underline-offset-[0.2em]">
            Email the same details to {site.org.email}
          </a>{' '}
          and a person will reply.
        </p>
      ) : null}
      {state === 'error' ? (
        <p role="alert" className="rounded-card border border-ink bg-paper-sunk p-4 text-sm text-ink sm:col-span-2 lg:col-span-3">
          Something went wrong and the inquiry was not saved. Try again, or{' '}
          <a href={mailto} className="font-semibold underline underline-offset-[0.2em]">
            email {site.org.email}
          </a>
          .
        </p>
      ) : null}
    </form>
  );
}
