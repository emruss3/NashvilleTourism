import SaveButton from '@/components/SaveButton';
import type { LiveEvent } from '@/lib/feeds/ticketmaster';

/**
 * Date-led schedule (page-designs/README.md §05): rows grouped by day with
 * an oversized day marker, the provider image when it is the event's own,
 * title, venue, time and sourced price. "View event" hands off to the ticket
 * provider; Save is a separate control. Nothing here is invented: no
 * status, price or image is shown unless the feed supplied it.
 */
export function groupByDay(events: LiveEvent[]): { date: string; events: LiveEvent[] }[] {
  const map = new Map<string, LiveEvent[]>();
  for (const e of events) {
    const list = map.get(e.date) ?? [];
    list.push(e);
    map.set(e.date, list);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, list]) => ({ date, events: list }));
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parts(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] ?? '';
  return { weekday, month: MONTHS[m - 1] ?? '', day: d };
}

export function formatTime(value: string): string {
  const [hourText, minute = '00'] = value.split(':');
  const hour = Number(hourText);
  if (!Number.isFinite(hour)) return value;
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? 'PM' : 'AM'}`;
}

function price(e: LiveEvent): string | undefined {
  if (typeof e.priceFrom !== 'number') return undefined;
  return `From ${new Intl.NumberFormat('en-US', { style: 'currency', currency: e.currency || 'USD', maximumFractionDigits: 0 }).format(e.priceFrom)}`;
}

export default function EventSchedule({ events }: { events: LiveEvent[] }) {
  const days = groupByDay(events);
  return (
    <div className="divide-y divide-paper-edge border-t border-paper-edge">
      {days.map((day) => {
        const { weekday, month, day: dayNum } = parts(day.date);
        return (
          <section key={day.date} aria-labelledby={`day-${day.date}`} className="grid gap-3 py-5 md:grid-cols-[6rem_1fr] md:gap-6">
            <h3 id={`day-${day.date}`} className="flex items-baseline gap-2 md:block">
              <span className="text-2xs font-semibold uppercase tracking-[0.14em] text-ink-soft md:block">{month}</span>
              <span className="font-display text-[2.5rem] font-extrabold leading-none tracking-[-0.04em] md:block md:text-[3.25rem]">{dayNum}</span>
              <span className="text-2xs font-semibold uppercase tracking-[0.14em] text-ink-soft md:block">{weekday}</span>
            </h3>
            <ul className="divide-y divide-paper-edge">
              {day.events.map((e) => (
                <li key={`${e.source}-${e.id}`}>
                  <EventRow event={e} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export function EventRow({ event }: { event: LiveEvent }) {
  const external = /^https?:\/\//i.test(event.ticketUrl);
  const photo = event.imageUrl && !event.imageIsFallback ? event.imageUrl : undefined;
  const cost = price(event);
  const chips = [event.segment, event.genre].filter((c): c is string => Boolean(c) && c !== 'Undefined');
  return (
    <article className="grid grid-cols-[1fr_auto] items-center gap-3 py-3 sm:grid-cols-[auto_1fr_auto] sm:gap-4">
      {photo ? (
        <div className="hidden w-28 shrink-0 overflow-hidden rounded-card bg-paper-sunk sm:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="" className="aspect-[16/10] h-auto w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
        </div>
      ) : (
        <div className="hidden sm:block" aria-hidden="true" />
      )}
      <div className="min-w-0">
        <h4 className="font-sans text-[17px] font-bold leading-snug text-ink">{event.name}</h4>
        <p className="mt-0.5 text-[15px] text-ink-soft">
          {event.venue}
          {event.time ? ` · ${formatTime(event.time)}` : ' · Time to be announced'}
          {cost ? ` · ${cost}` : ''}
        </p>
        {chips.length > 0 ? (
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {chips.slice(0, 2).map((c) => (
              <li key={c} className="rounded border border-paper-edge px-2 py-0.5 text-2xs font-medium text-ink-soft">
                {c}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        {external ? (
          <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary min-h-11 px-4 text-sm">
            View event
            <span aria-hidden="true">→</span>
            <span className="sr-only"> (opens the ticket provider in a new tab)</span>
          </a>
        ) : (
          <a href={event.ticketUrl} className="btn-secondary min-h-11 px-4 text-sm">
            View event
            <span aria-hidden="true">→</span>
          </a>
        )}
        <SaveButton
          variant="icon"
          item={{ id: `event:${event.source}-${event.id}`, kind: 'event', title: event.name, href: event.ticketUrl, meta: event.venue, date: event.date }}
        />
      </div>
    </article>
  );
}
