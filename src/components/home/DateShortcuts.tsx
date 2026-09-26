import Link from 'next/link';
import DateField from '@/components/DateField';
import { WHEN_OPTIONS } from '@/lib/explore';
import { todayChicagoISO } from '@/lib/stay-dates';

/**
 * Quick date access for "On the calendar." (HOMEPAGE.md §4). Tonight,
 * Tomorrow, This weekend and Next 7 days resolve in America/Chicago on the
 * events page at request time, so the links never go stale between
 * revalidations. One date field, a plain GET form to the same page for any
 * other day: a click anywhere on the box opens the picker, and picking a
 * day submits straight away.
 */
export default function DateShortcuts() {
  const today = todayChicagoISO();
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <ul className="flex flex-wrap gap-1.5" aria-label="Quick dates">
        {WHEN_OPTIONS.map((w) => (
          <li key={w.value}>
            <Link
              href={`/events/?when=${w.value}`}
              className="inline-flex min-h-10 items-center rounded border border-paper-edge px-3 text-sm font-semibold text-ink hover:border-ink"
            >
              {w.label}
            </Link>
          </li>
        ))}
      </ul>
      <form action="/events/" method="get" className="flex items-center gap-1.5" aria-label="Find events on a date">
        <label htmlFor="calendar-from" className="sr-only">
          Pick a date
        </label>
        <DateField id="calendar-from" name="from" required min={today} autoSubmit className="field-input h-10 min-h-0 w-[12rem] text-sm" label="Open the calendar to pick a date" />
        <button type="submit" className="btn-secondary h-10 min-h-0 px-3.5 text-sm">
          Go
        </button>
      </form>
    </div>
  );
}
