'use client';

import { useRef } from 'react';
import { CalendarIcon } from '@/components/Icons';

function nextDay(iso: string): string {
  const t = Date.parse(`${iso}T00:00:00Z`);
  return Number.isFinite(t) ? new Date(t + 86_400_000).toISOString().slice(0, 10) : iso;
}

/**
 * One calendar box for a stay, matching the homepage date box: a click
 * anywhere on it opens the picker. Check-in and check-out are two native
 * date inputs inside the same box, so the form still submits `checkin` and
 * `checkout`, and once a check-in day is picked the check-out picker opens
 * on its own with the day after as its earliest choice.
 */
export default function StayDatesField({
  id,
  checkin,
  checkout,
  onChange,
  min,
  className = 'field-input',
  iconClassName = 'text-ink-soft',
  nameIn = 'checkin',
  nameOut = 'checkout',
}: {
  id: string;
  checkin: string;
  checkout: string;
  onChange: (dates: { checkin: string; checkout: string }) => void;
  /** Earliest check-in, YYYY-MM-DD. */
  min?: string;
  /** Box styling; the native inputs inside are unstyled. */
  className?: string;
  iconClassName?: string;
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

  const inputClass = 'min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] text-ink outline-none focus-visible:underline focus-visible:underline-offset-4';

  return (
    <div
      className={`${className} relative flex cursor-pointer items-center gap-1 pl-10 pr-2`}
      onClick={(e) => {
        // Clicks on the inputs open their own picker; anything else opens the next one to fill.
        if ((e.target as HTMLElement).tagName === 'INPUT') return;
        open(checkin ? 'out' : 'in');
      }}
    >
      <button type="button" onClick={() => open('in')} aria-label="Open the calendar to choose your dates" className={`absolute left-0 top-0 flex h-full w-10 items-center justify-center ${iconClassName} hover:text-ink`}>
        <CalendarIcon size={16} />
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
        onClick={() => open('in')}
        onChange={(e) => {
          const value = e.target.value;
          onChange({ checkin: value, checkout: checkout && value && checkout > value ? checkout : '' });
          if (value) setTimeout(() => open('out'), 0);
        }}
        className={inputClass}
        aria-label="Check-in"
      />
      <span aria-hidden="true" className="px-1 text-ink-soft">
        →
      </span>
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
        onClick={() => open('out')}
        onChange={(e) => onChange({ checkin, checkout: e.target.value })}
        className={inputClass}
        aria-label="Check-out"
      />
    </div>
  );
}
