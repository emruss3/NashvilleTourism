import { AVAILABILITY_LABEL, monthLabel, nextMonths, spaceMonthStatus, type AvailabilityView } from '@/lib/events/availability';
import type { SpaceAvailability } from '@/lib/events/types';

const STYLE: Record<AvailabilityView, string> = {
  open: 'border-ink bg-paper text-ink',
  limited: 'border-ink bg-paper-sunk text-ink',
  booked: 'border-ink bg-ink text-paper',
  ask: 'border-paper-edge bg-paper text-ink-soft',
};

/**
 * Three months of a space's availability as the venue stated it: Open,
 * Limited, Booked, or Ask when the venue has said nothing. A statement, not
 * a hold; the venue confirms when it replies.
 */
export default function AvailabilityStrip({ spaceId, rows, months = nextMonths(3), compact = false }: { spaceId: string; rows: SpaceAvailability[]; months?: string[]; compact?: boolean }) {
  const cells = months.map((m) => ({ month: m, status: spaceMonthStatus(rows, spaceId, m) }));
  const anyStated = cells.some((c) => c.status !== 'ask');
  if (!anyStated && compact) return null;
  return (
    <div>
      {!compact ? <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-ink-soft">Availability</p> : null}
      <ul className={`${compact ? '' : 'mt-1 '}flex flex-wrap gap-1.5`} aria-label="Availability by month, as stated by the venue">
        {cells.map((c) => (
          <li key={c.month} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-2xs ${STYLE[c.status]}`}>
            <span className="font-semibold">{monthLabel(c.month)}</span>
            <span>{AVAILABILITY_LABEL[c.status]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
