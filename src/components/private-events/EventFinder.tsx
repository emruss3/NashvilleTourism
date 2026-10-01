'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Chip } from '@/components/Ui';
import { ANALYTICS_EVENTS, track } from '@/lib/analytics';
import { neighborhoodName, neighborhoods } from '@/lib/content/neighborhoods';
import { ANY_AREA, FINDER_EVENT_TYPES, MAX_PRIORITIES, PRIORITIES, finderEventType, finderParams, recommend, sizesFor, type FinderInput, type FinderVenue, type Priority, type SpaceMatch } from '@/lib/events/finder';
import { priceBandLabel, spacePriceBand } from '@/lib/events/types';
import { VENUE_KIND_LABEL, briefHref, withShortlist } from '@/lib/private-events';

/**
 * The event finder: event type, group size, area and up to three
 * priorities, then a recommendation built from those choices and the
 * published venue rows. No contact details are asked for here. The
 * selections live in the URL (`event`, `size`, `area`, `pri`) so a planner
 * who goes to the brief and comes back finds them as they left them, and
 * "Build my inquiry" carries every one of them into the brief.
 */
export default function EventFinder({ venues, initial, shortlist }: { venues: FinderVenue[]; initial: FinderInput; shortlist: string[] }) {
  const [eventType, setEventType] = useState<string>(initial.eventType ?? '');
  const [size, setSize] = useState<string>(initial.size ?? '');
  const [area, setArea] = useState<string>(initial.area ?? ANY_AREA);
  const [priorities, setPriorities] = useState<Priority[]>(initial.priorities);
  const [submitted, setSubmitted] = useState<FinderInput | null>(initial.eventType && initial.size ? initial : null);
  const [errors, setErrors] = useState<{ eventType?: string; size?: string }>({});
  const resultRef = useRef<HTMLDivElement>(null);
  const announcedRef = useRef(false);

  const input: FinderInput = useMemo(() => ({ eventType: finderEventType(eventType)?.value, size: size || undefined, area: area || ANY_AREA, priorities }), [eventType, size, area, priorities]);
  const rec = useMemo(() => (submitted ? recommend(submitted, venues) : null), [submitted, venues]);
  const stale = Boolean(submitted) && JSON.stringify(submitted) !== JSON.stringify(input);

  // Mirror the selections into the URL (replace, no scroll) so they survive a round trip to the brief.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    for (const k of ['event', 'size', 'area', 'pri']) sp.delete(k);
    finderParams(input).forEach((v, k) => sp.set(k, v));
    const qs = sp.toString();
    const next = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`;
    // Next.js patches replaceState so useSearchParams elsewhere (the shortlist bar) sees the change; pass null state so it does.
    if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) window.history.replaceState(null, '', next);
  }, [input]);

  // The event type decides which group sizes are offered: a bachelorette weekend is not a 200-person event.
  const typeDef = finderEventType(eventType);
  const sizes = sizesFor(typeDef?.value);
  function onEventType(value: string) {
    setEventType(value);
    if (size && !sizesFor(finderEventType(value)?.value).some((b) => b.slug === size)) setSize('');
  }
  function togglePriority(p: Priority) {
    setPriorities((list) => (list.includes(p) ? list.filter((x) => x !== p) : list.length >= MAX_PRIORITIES ? list : [...list, p]));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!input.eventType) next.eventType = 'Choose an event type.';
    if (!input.size) next.size = 'Choose a group size.';
    setErrors(next);
    if (Object.keys(next).length) {
      document.getElementById(next.eventType ? 'finder-event' : 'finder-size')?.focus();
      return;
    }
    setSubmitted(input);
    announcedRef.current = true;
    track(ANALYTICS_EVENTS.EVENTS_FINDER_RECOMMENDED, { occasion: input.eventType, guests_band: input.size, neighborhood: input.area, priorities: input.priorities.join(',') });
  }

  useEffect(() => {
    if (rec && announcedRef.current) {
      announcedRef.current = false;
      resultRef.current?.focus({ preventScroll: true });
      resultRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }
  }, [rec]);

  const promoted = FINDER_EVENT_TYPES.filter((t) => t.promoted);
  const secondary = FINDER_EVENT_TYPES.filter((t) => !t.promoted);
  const full = priorities.length >= MAX_PRIORITIES;
  const briefLink = (extra: { venue?: string } = {}) => briefHref({ event: input.eventType, size: input.size, area: input.area, priorities: input.priorities, occasion: finderEventType(input.eventType)?.occasion, shortlist, ...extra });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10">
      <form onSubmit={onSubmit} noValidate aria-labelledby="finder-title" className="grid gap-5 rounded-card border-2 border-ink bg-paper p-5 sm:p-6">
        <div>
          <label htmlFor="finder-event" className="field-label">
            Event type
          </label>
          <select id="finder-event" name="event" value={eventType} onChange={(e) => onEventType(e.target.value)} aria-invalid={Boolean(errors.eventType)} aria-describedby={errors.eventType ? 'finder-event-error' : undefined} className="field-input">
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
          {errors.eventType ? (
            <p id="finder-event-error" role="alert" className="mt-1 text-sm text-ink">
              {errors.eventType}
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor="finder-size" className="field-label">
            Group size
          </label>
          <select id="finder-size" name="size" value={size} onChange={(e) => setSize(e.target.value)} aria-invalid={Boolean(errors.size)} aria-describedby={errors.size ? 'finder-size-error' : undefined} className="field-input">
            <option value="">Select a group size</option>
            {sizes.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.label} guests
              </option>
            ))}
          </select>
          {typeDef && sizes.length < 4 ? <p className="mt-1 text-2xs text-ink-soft">The sizes a {typeDef.label.toLowerCase()} usually comes in. Bigger group? Choose Corporate event or Something else.</p> : null}
          {errors.size ? (
            <p id="finder-size-error" role="alert" className="mt-1 text-sm text-ink">
              {errors.size}
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor="finder-area" className="field-label">
            Preferred area
          </label>
          <select id="finder-area" name="area" value={area} onChange={(e) => setArea(e.target.value)} className="field-input">
            <option value={ANY_AREA}>Open to the best fit</option>
            {neighborhoods.map((n) => (
              <option key={n.slug} value={n.slug}>
                {n.name}
              </option>
            ))}
          </select>
        </div>
        <fieldset>
          <legend className="field-label">
            Priorities <span className="font-normal text-ink-soft">(up to {MAX_PRIORITIES})</span>
          </legend>
          <ul className="flex flex-wrap gap-2">
            {PRIORITIES.map((p) => {
              const on = priorities.includes(p.value);
              const disabled = !on && full;
              return (
                <li key={p.value}>
                  <label className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded border px-3 text-sm transition-colors focus-within:ring-2 focus-within:ring-ink focus-within:ring-offset-2 focus-within:ring-offset-paper ${on ? 'border-ink bg-ink font-semibold text-paper' : disabled ? 'cursor-not-allowed border-paper-edge bg-paper text-ink-faint' : 'border-paper-edge bg-paper text-ink hover:border-ink'}`}>
                    <input type="checkbox" name="pri" value={p.value} checked={on} disabled={disabled} onChange={() => togglePriority(p.value)} className="sr-only" />
                    <span aria-hidden="true">{on ? '✓' : '+'}</span>
                    {p.label}
                  </label>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-2xs text-ink-soft" aria-live="polite">
            {full ? `Three chosen. Remove one to pick another.` : `${priorities.length} of ${MAX_PRIORITIES} chosen.`}
          </p>
        </fieldset>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn-primary">
            See my recommendation
            <span aria-hidden="true">→</span>
          </button>
          <p className="text-2xs text-ink-soft">No contact details needed to see it.</p>
        </div>
      </form>

      <div id="finder-result" ref={resultRef} tabIndex={-1} aria-live="polite" className="scroll-mt-28 outline-none">
        {rec && submitted ? (
          <div className="grid gap-6">
            {stale ? (
              <p role="status" className="rounded border border-dashed border-ink bg-paper-sunk px-3 py-2 text-sm text-ink">
                You changed something. Select <strong className="font-semibold">See my recommendation</strong> to update this.
              </p>
            ) : null}
            <div>
              <p className="eyebrow">Recommended format</p>
              <h3 className="mt-1 font-display text-[1.75rem] font-extrabold leading-tight tracking-[-0.03em] text-ink sm:text-[2rem]">{rec.format.title}</h3>
              <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-ink-soft">{rec.format.body}</p>
            </div>
            <div>
              <p className="eyebrow">Suggested area</p>
              <h4 className="mt-1 font-sans text-[17px] font-bold text-ink">
                {rec.area.name}
                {rec.area.chosen ? <span className="ml-2 text-sm font-normal text-ink-soft">(your choice)</span> : null}
              </h4>
              <p className="mt-1 max-w-prose text-[15px] leading-relaxed text-ink-soft">{rec.area.body}</p>
              {!rec.area.listed ? <p className="mt-1 max-w-prose text-sm text-ink-soft">No verified space is listed in {rec.area.name} yet; the events desk can build a shortlist there by hand.</p> : null}
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="eyebrow">Why it fits</p>
                <ul className="mt-2 grid gap-2 text-[15px] leading-snug text-ink">
                  {rec.why.map((w) => (
                    <li key={w} className="flex gap-2.5">
                      <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="eyebrow">Plan for</p>
                <ul className="mt-2 grid gap-2 text-[15px] leading-snug text-ink">
                  {rec.considerations.map((c) => (
                    <li key={c} className="flex gap-2.5">
                      <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-soft" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div>
              <p className="eyebrow">{rec.spaces.length ? 'Verified spaces that fit' : 'Verified spaces'}</p>
              {rec.spaces.length ? (
                <ul className="mt-2 grid gap-3">
                  {rec.spaces.map((m) => (
                    <li key={`${m.venueSlug}/${m.space.slug}`}>
                      <SpaceMatchRow match={m} layout={rec.layout} shortlist={shortlist} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 max-w-prose text-[15px] text-ink-soft">No verified space matches every part of this brief yet. Send it anyway: the events desk shortlists by hand from venues that have not listed here, and tells you what it found.</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 border-t border-paper-edge pt-5">
              <Link href={briefLink()} className="btn-primary">
                Build my inquiry
                <span aria-hidden="true">→</span>
              </Link>
              <p className="text-2xs text-ink-soft">Your choices carry over. You review the whole brief before anything is sent.</p>
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-[240px] flex-col justify-center rounded-card border border-dashed border-paper-edge bg-paper-card p-6">
            <p className="font-display text-[1.375rem] font-extrabold tracking-[-0.03em] text-ink">Your recommendation appears here.</p>
            <p className="mt-2 max-w-md text-[15px] text-ink-soft">A format, an area, the reasons, what to plan for, and the verified spaces that fit. Seated versus standing, conversation versus live music, AV, weather backups and transport all change the answer.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SpaceMatchRow({ match, layout, shortlist }: { match: SpaceMatch; layout: 'seated' | 'standing' | 'mixed'; shortlist: string[] }) {
  const s = match.space;
  const band = spacePriceBand(s);
  const href = withShortlist(`/private-events/venues/${match.venueSlug}/`, shortlist);
  return (
    <article className="grid gap-2 rounded-card border border-paper-edge bg-paper p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
      <div>
        <p className="eyebrow inline-flex flex-wrap items-center gap-x-2">
          <span>{VENUE_KIND_LABEL[match.venueKind]}</span>
          <span aria-hidden="true">·</span>
          <span>{neighborhoodName(match.neighborhoodSlug)}</span>
          {!match.inArea ? (
            <>
              <span aria-hidden="true">·</span>
              <span>Outside your area</span>
            </>
          ) : null}
        </p>
        <h5 className="mt-1 font-sans text-[16px] font-bold text-ink">
          {s.name} <span className="font-normal text-ink-soft">at {match.venueName}</span>
        </h5>
        <p className="mt-1 text-[14px] text-ink">
          <span className={layout === 'seated' ? 'font-semibold' : ''}>Seats {s.seatedCapacity.toLocaleString('en-US')}</span> <span className="text-ink-soft">/</span> <span className={layout === 'standing' ? 'font-semibold' : ''}>standing {s.standingCapacity.toLocaleString('en-US')}</span>
          {s.minGuests ? <span className="text-ink-soft"> · minimum {s.minGuests.toLocaleString('en-US')} guests</span> : null}
          {band ? (
            <span className="text-ink-soft">
              {' '}
              · <strong className="font-semibold tracking-[0.08em] text-ink">{band.band}</strong> {priceBandLabel(band.band)} {band.basis}
            </span>
          ) : null}
        </p>
        <p className="mt-1.5 flex flex-wrap gap-1.5">
          {match.verified ? <Chip>Verified by Nashville.com</Chip> : null}
          {match.ownedByBph ? <Chip>Owned by BPH Hospitality, Nashville.com&rsquo;s parent company</Chip> : null}
          {match.meets.map((p) => (
            <Chip key={p}>✓ {PRIORITIES.find((d) => d.value === p)?.label}</Chip>
          ))}
        </p>
      </div>
      <Link href={href} className="inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-ink underline-offset-[0.2em] hover:underline">
        View space
        <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}
