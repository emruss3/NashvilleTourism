'use client';

import { useMemo, useState } from 'react';
import type {
  ViatorAvailabilityQuote,
  ViatorScheduleOptionSummary,
  ViatorScheduleSummary,
} from '@/lib/feeds/viator-availability';

type ScheduleResponse = {
  live?: boolean;
  schedule?: ViatorScheduleSummary | null;
  error?: string | null;
};

type QuoteResponse = {
  live?: boolean;
  fullAccessRequired?: boolean;
  quote?: ViatorAvailabilityQuote;
  error?: string | null;
};

type Props = {
  productCode: string;
  productTitle: string;
  productUrl: string;
  fallbackPrice?: string;
  currency?: string;
};

function nashvilleToday(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function prettyDate(value?: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T12:00:00-05:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Chicago',
  }).format(date);
}

function prettyTime(value: string): string {
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  const date = new Date(2000, 0, 1, hours, minutes);
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function optionLabel(option: ViatorScheduleOptionSummary): string {
  return option.title || option.productOptionCode.replaceAll('_', ' ');
}

function errorText(value: unknown): string {
  return typeof value === 'string' && value.trim()
    ? value
    : 'Viator live availability is temporarily unavailable.';
}

export default function ViatorLiveAvailability({
  productCode,
  productTitle,
  productUrl,
  fallbackPrice,
  currency = 'USD',
}: Props) {
  const [scheduleState, setScheduleState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [schedule, setSchedule] = useState<ViatorScheduleSummary | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [travelDate, setTravelDate] = useState('');
  const [optionCode, setOptionCode] = useState('');
  const [startTime, setStartTime] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [quoteState, setQuoteState] = useState<'idle' | 'loading' | 'ready' | 'limited' | 'error'>('idle');
  const [quote, setQuote] = useState<ViatorAvailabilityQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const selectedOption = useMemo(
    () => schedule?.options.find((option) => option.productOptionCode === optionCode),
    [schedule, optionCode],
  );

  const availableTimes = selectedOption?.startTimes.length
    ? selectedOption.startTimes
    : schedule?.startTimes ?? [];
  const dateRanges = selectedOption?.dateRanges.length
    ? selectedOption.dateRanges
    : schedule?.dateRanges ?? [];
  const days = selectedOption?.daysOfWeek.length
    ? selectedOption.daysOfWeek
    : schedule?.daysOfWeek ?? [];
  const ageBands = selectedOption?.ageBands.length
    ? selectedOption.ageBands
    : schedule?.ageBands ?? [];
  const childSupported = ageBands.length === 0 || ageBands.includes('CHILD');
  const shownPrice = selectedOption?.fromPrice?.formatted || schedule?.fromPrice?.formatted || fallbackPrice;

  async function loadSchedules() {
    setScheduleState('loading');
    setScheduleError(null);
    setQuoteState('idle');
    setQuote(null);
    try {
      const response = await fetch(`/api/viator/availability/${encodeURIComponent(productCode)}`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      const data = (await response.json()) as ScheduleResponse;
      if (!response.ok || !data.live || !data.schedule) {
        throw new Error(errorText(data.error));
      }
      setSchedule(data.schedule);
      const firstOption = data.schedule.options[0];
      if (firstOption) {
        setOptionCode(firstOption.productOptionCode);
        setStartTime(firstOption.startTimes[0] || data.schedule.startTimes[0] || '');
      } else {
        setStartTime(data.schedule.startTimes[0] || '');
      }
      setScheduleState('ready');
    } catch (error) {
      setScheduleState('error');
      setScheduleError(error instanceof Error ? error.message : errorText(error));
    }
  }

  async function checkLivePrice() {
    if (!travelDate) {
      setQuoteState('error');
      setQuoteError('Choose a travel date first.');
      return;
    }

    setQuoteState('loading');
    setQuote(null);
    setQuoteError(null);
    const paxMix = [
      { ageBand: ageBands.includes('TRAVELER') && !ageBands.includes('ADULT') ? 'TRAVELER' : 'ADULT', numberOfTravelers: adults },
      ...(children > 0 && childSupported
        ? [{ ageBand: 'CHILD', numberOfTravelers: children }]
        : []),
    ];

    try {
      const response = await fetch('/api/viator/availability/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          productCode,
          travelDate,
          currency: schedule?.currency || currency,
          paxMix,
          productOptionCode: optionCode || undefined,
          startTime: startTime || undefined,
        }),
      });
      const data = (await response.json()) as QuoteResponse;
      if (data.fullAccessRequired) {
        setQuoteState('limited');
        setQuoteError(
          'Live schedules are connected. Exact traveler quotes will appear here as soon as Viator enables Full-access Affiliate permissions.',
        );
        return;
      }
      if (!response.ok || !data.live || !data.quote) {
        throw new Error(errorText(data.error));
      }
      setQuote(data.quote);
      setQuoteState('ready');
    } catch (error) {
      setQuoteState('error');
      setQuoteError(error instanceof Error ? error.message : errorText(error));
    }
  }

  return (
    <section aria-labelledby="viator-live-availability-heading" className="rounded-card border border-paper-edge bg-paper-card p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow mb-1.5">Live from Viator</p>
          <h2 id="viator-live-availability-heading" className="font-sans text-xl font-bold text-navy">
            Dates, availability & pricing
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
            Check the operating schedule here, then continue to Viator for final confirmation and checkout.
          </p>
        </div>
        {shownPrice ? (
          <p className="text-right text-sm text-ink-soft">
            From <span className="block text-xl font-bold text-navy">{shownPrice}</span>
          </p>
        ) : null}
      </div>

      {scheduleState === 'idle' ? (
        <button type="button" onClick={loadSchedules} className="btn-primary mt-5 min-h-[46px] w-full sm:w-auto">
          Load live dates & pricing
        </button>
      ) : null}

      {scheduleState === 'loading' ? (
        <p className="mt-5 text-sm text-ink-soft" aria-live="polite">
          Loading the current Viator schedule…
        </p>
      ) : null}

      {scheduleState === 'error' ? (
        <div className="mt-5 rounded border border-paper-edge bg-paper-sunk p-4 text-sm text-ink-soft" role="status">
          <p className="font-semibold text-ink">Live schedule unavailable</p>
          <p className="mt-1">{scheduleError}</p>
          <button type="button" onClick={loadSchedules} className="btn-secondary mt-4 min-h-[44px]">
            Try again
          </button>
        </div>
      ) : null}

      {scheduleState === 'ready' && schedule ? (
        <div className="mt-5 border-t border-paper-edge pt-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {schedule.options.length > 1 ? (
              <div>
                <label htmlFor={`viator-option-${productCode}`} className="mb-1 block text-2xs font-bold uppercase tracking-wider text-ink-faint">
                  Experience option
                </label>
                <select
                  id={`viator-option-${productCode}`}
                  value={optionCode}
                  onChange={(event) => {
                    const nextCode = event.target.value;
                    setOptionCode(nextCode);
                    const next = schedule.options.find((option) => option.productOptionCode === nextCode);
                    setStartTime(next?.startTimes[0] || schedule.startTimes[0] || '');
                    setQuoteState('idle');
                  }}
                  className="field-input"
                >
                  {schedule.options.map((option) => (
                    <option key={option.productOptionCode} value={option.productOptionCode}>
                      {optionLabel(option)}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div>
              <label htmlFor={`viator-date-${productCode}`} className="mb-1 block text-2xs font-bold uppercase tracking-wider text-ink-faint">
                Travel date
              </label>
              <input
                id={`viator-date-${productCode}`}
                type="date"
                min={nashvilleToday()}
                value={travelDate}
                onChange={(event) => {
                  setTravelDate(event.target.value);
                  setQuoteState('idle');
                }}
                className="field-input"
              />
            </div>

            {availableTimes.length ? (
              <div>
                <label htmlFor={`viator-time-${productCode}`} className="mb-1 block text-2xs font-bold uppercase tracking-wider text-ink-faint">
                  Start time
                </label>
                <select
                  id={`viator-time-${productCode}`}
                  value={startTime}
                  onChange={(event) => {
                    setStartTime(event.target.value);
                    setQuoteState('idle');
                  }}
                  className="field-input"
                >
                  <option value="">Any available time</option>
                  {availableTimes.map((time) => (
                    <option key={time} value={time}>
                      {prettyTime(time)}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor={`viator-adults-${productCode}`} className="mb-1 block text-2xs font-bold uppercase tracking-wider text-ink-faint">
                  Adults
                </label>
                <select
                  id={`viator-adults-${productCode}`}
                  value={adults}
                  onChange={(event) => {
                    setAdults(Number(event.target.value));
                    setQuoteState('idle');
                  }}
                  className="field-input"
                >
                  {Array.from({ length: 15 }, (_, index) => index + 1).map((count) => (
                    <option key={count} value={count}>{count}</option>
                  ))}
                </select>
              </div>
              {childSupported ? (
                <div>
                  <label htmlFor={`viator-children-${productCode}`} className="mb-1 block text-2xs font-bold uppercase tracking-wider text-ink-faint">
                    Children
                  </label>
                  <select
                    id={`viator-children-${productCode}`}
                    value={children}
                    onChange={(event) => {
                      setChildren(Number(event.target.value));
                      setQuoteState('idle');
                    }}
                    className="field-input"
                  >
                    {Array.from({ length: 11 }, (_, index) => index).map((count) => (
                      <option key={count} value={count}>{count}</option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>
          </div>

          {(dateRanges.length || days.length) ? (
            <div className="mt-4 rounded border border-paper-edge bg-paper-sunk p-4 text-sm text-ink-soft">
              {dateRanges[0] ? (
                <p>
                  <span className="font-semibold text-ink">Published schedule:</span>{' '}
                  {prettyDate(dateRanges[0].startDate)}–{prettyDate(dateRanges[0].endDate)}
                </p>
              ) : null}
              {days.length ? (
                <p className="mt-1">
                  <span className="font-semibold text-ink">Typical operating days:</span>{' '}
                  {days.map((day) => day.slice(0, 3).toLowerCase().replace(/^./, (value) => value.toUpperCase())).join(', ')}
                </p>
              ) : null}
              <p className="mt-2 text-xs text-ink-faint">
                Published schedules can contain exceptions and sold-out dates. A schedule is not an inventory hold.
              </p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={checkLivePrice}
            disabled={quoteState === 'loading'}
            className="btn-primary mt-5 min-h-[46px] w-full disabled:cursor-wait disabled:opacity-60 sm:w-auto"
          >
            {quoteState === 'loading' ? 'Checking Viator…' : 'Check live availability & price'}
          </button>

          <div className="mt-4" aria-live="polite">
            {quoteState === 'ready' && quote ? (
              <div className="rounded border border-paper-edge bg-paper-sunk p-4">
                <p className="font-semibold text-navy">
                  {quote.available === false ? 'Not available for this selection' : 'Available on Viator'}
                </p>
                {quote.totalPrice ? (
                  <p className="mt-1 text-2xl font-bold text-navy">{quote.totalPrice.formatted}</p>
                ) : null}
                {quote.message ? <p className="mt-2 text-sm text-ink-soft">{quote.message}</p> : null}
                <p className="mt-2 text-xs text-ink-faint">
                  This is a live check, not a reservation or price hold. Viator confirms the final amount at checkout.
                </p>
              </div>
            ) : null}

            {quoteState === 'limited' ? (
              <div className="rounded border border-paper-edge bg-paper-sunk p-4 text-sm text-ink-soft">
                <p className="font-semibold text-ink">Schedule pricing is live</p>
                <p className="mt-1">{quoteError}</p>
                <p className="mt-2 text-xs text-ink-faint">
                  You can still confirm the exact date, traveler mix, and final price directly on Viator.
                </p>
              </div>
            ) : null}

            {quoteState === 'error' ? (
              <div className="rounded border border-paper-edge bg-paper-sunk p-4 text-sm text-ink-soft">
                <p className="font-semibold text-ink">We could not complete the live check</p>
                <p className="mt-1">{quoteError}</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <a
        href={productUrl}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="btn-secondary mt-5 min-h-[46px] w-full text-center sm:w-auto"
        aria-label={`Continue to Viator to book ${productTitle} (opens in a new tab)`}
      >
        Continue to Viator
      </a>
      <p className="mt-3 text-xs leading-relaxed text-ink-faint">
        Viator handles checkout, payment, booking confirmation, changes, cancellations, and refunds. NashRoam never receives your payment-card information.
      </p>
    </section>
  );
}
