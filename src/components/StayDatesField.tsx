'use client';

import { useRef } from 'react';
import { CalendarIcon } from '@/components/Icons';

function nextDay(iso: string): string {
  const t = Date.parse(`${iso}T00:00:00Z`);
  return Number.isFinite(t) ? new Date(t + 86_400_000).toISOString().slice(0, 10) : iso;
}

function dayLabel(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));
}

/**
 * One calendar control for a stay, matching the homepage date box. The
 * visible part is a single button that reads "Choose dates" or
 * "Fri, Oct 9 → Sun, Oct 11". Clicking it opens the check-in picker; once a
 * check-in day is chosen the check-out picker opens on its own with the
 * next day as its earliest choice. The two native date inputs sit invisibly
 * inside the box, so the form still submits `checkin` and `checkout`, the
 * pickers anchor to the box, and keyboard and screen-reader users can Tab
 * to each date directly.
 */
export default function StayDatesField({
  id,
  checkin,
  checkout,
  onChange,
  min,
  className = 'field-input',
  nameIn = 'checkin',
  nameOut = 'checkout',
}: {
  id: string;
  checkin: string;
  checkout: string;
  onChange: (dates: { checkin: string; checkout: string }) => void;
  /** Earliest check-in, YYYY-MM-DD. */
  min?: string;
  /** Box styling for the visible button. */
  className?: string;
  nameIn?: string;
  nameOut?: string;
}) {
  const inRef = useRef<HTMLInputElement>(null);
  const outRef = useRef<HTMLInputElement>(null);

  function open(which: 'in' | 'out') {
    const input = which === 'in' ? inRef.current : outRef.current;
    if (!input) return;
    try {
      if (typeof input.showPicker === 'function') input.showPicker();
      else input.focus();
    } catch {
      input.focus();
    }
  }

  const summary = checkin && checkout ? `${dayLabel(checkin)} → ${dayLabel(checkout)}` : checkin ? `${dayLabel(checkin)} → check-out` : 'Choose dates';
  const hidden = 'absolute inset-0 h-full w-full opacity-0 pointer-events-none';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => open(checkin && !checkout ? 'out' : 'in')}
        aria-label={checkin && checkout ? `Dates: ${summary}. Open the calendar to change them` : 'Open the calendar to choose your dates'}
        className={`${className} flex w-full items-center gap-3 text-left`}
      >
        <span className="shrink-0 text-ink-soft" aria-hidden="true">
          <CalendarIcon size={16} />
        </span>
        <span className={checkin ? 'text-ink' : 'text-ink-soft'}>{summary}</span>
      </button>
      <label htmlFor={`${id}-in`} className="sr-only">
        Check-in
      </label>
      <input
        ref={inRef}
        id={`${id}-in`}
        name={nameIn}
        type="date"
        min={min}
        value={checkin}
        tabIndex={-1}
        onChange={(e) => {
          const value = e.target.value;
          onChange({ checkin: value, checkout: checkout && value && checkout > value ? checkout : '' });
          if (value) setTimeout(() => open('out'), 0);
        }}
        className={hidden}
      />
      <label htmlFor={`${id}-out`} className="sr-only">
        Check-out
      </label>
      <input
        ref={outRef}
        id={`${id}-out`}
        name={nameOut}
        type="date"
        min={checkin ? nextDay(checkin) : min}
        value={checkout}
        tabIndex={-1}
        onChange={(e) => onChange({ checkin, checkout: e.target.value })}
        className={hidden}
      />
    </div>
  );
}
