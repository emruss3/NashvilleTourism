import Link from 'next/link';
import { CalendarIcon } from '@/components/Icons';
import { WHEN_OPTIONS } from '@/lib/explore';

/**
 * Quick date access for "On the calendar." (HOMEPAGE.md §4). Tonight,
 * Tomorrow, This weekend and Next 7 days resolve in America/Chicago on the
 * events page at request time, so the links never go stale between
 * revalidations. The date field is a plain GET form to the same page for
 * any other day; a second date is optional.
 */
export default function DateShortcuts() {
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
          From date
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-soft">
            <CalendarIcon size={16} />
          </span>
          <input id="calendar-from" name="from" type="date" required className="field-input h-10 min-h-0 w-[11.5rem] pl-8 text-sm" />
        </div>
        <label htmlFor="calendar-to" className="sr-only">
          To date (optional)
        </label>
        <input id="calendar-to" name="to" type="date" className="field-input hidden h-10 min-h-0 w-[10.5rem] text-sm md:block" />
        <button type="submit" className="btn-secondary h-10 min-h-0 px-3.5 text-sm">
          Go
        </button>
      </form>
    </div>
  );
}
