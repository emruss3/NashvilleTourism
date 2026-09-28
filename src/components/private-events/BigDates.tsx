import Link from 'next/link';
import { CalendarIcon } from '@/components/Icons';
import SectionHead from '@/components/hub/SectionHead';
import { formatKeyDate } from '@/lib/events/present';
import { listKeyDates } from '@/lib/events/venues';
import { withShortlist } from '@/lib/private-events';

/**
 * The dates venues fill first, from `event_key_dates` (content, kept by hand).
 * Phase 1 asks the venues through a brief; the per-venue availability strip
 * is Phase 3. Renders nothing when the table is empty.
 */
export default async function BigDates({ shortlist }: { shortlist: string[] }) {
  const dates = await listKeyDates({ limit: 6 });
  if (!dates.length) return null;
  return (
    <section className="shell section" aria-labelledby="big-dates-title">
      <SectionHead id="big-dates-title" size="md" title="Big dates fill first." support="If your event lands near one of these, brief venues early. We tell each venue the date so they can answer availability in their first reply." />
      <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {dates.map((d) => (
          <li key={`${d.date}-${d.label}`} className="flex items-start gap-3 rounded-card border border-paper-edge bg-paper p-4">
            <span className="mt-0.5 text-ink" aria-hidden="true">
              <CalendarIcon size={20} />
            </span>
            <div className="min-w-0">
              <p className="font-sans text-[15px] font-bold text-ink">{d.label}</p>
              <p className="text-sm text-ink-soft">{formatKeyDate(d.date)}</p>
              <Link href={withShortlist(`/private-events/?date=${d.date}#inquiry`, shortlist)} className="mt-1 inline-flex min-h-8 items-center text-sm font-semibold text-ink underline underline-offset-[0.2em]">
                Ask venues about this date
              </Link>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
