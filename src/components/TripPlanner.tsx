'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ANALYTICS_EVENTS, track } from '@/lib/analytics';
import { neighborhoods } from '@/lib/content/neighborhoods';
import {
  INTEREST_OPTIONS,
  TRIP_TYPE_LABELS,
  buildItinerary,
  suggestHotels,
  tripLength,
  type ExperienceCandidate,
  type PlannerContextCandidate,
  type PlannerPlaceCandidate,
} from '@/lib/itinerary';
import type { Budget, NeighborhoodSlug, Pace, TripInput, TripType } from '@/lib/types';
import { MapLink } from './Ui';
import { formatDate } from './Trust';

const DEFAULTS: TripInput = {
  startDate: '',
  endDate: '',
  travelers: 2,
  tripType: 'first-visit',
  interests: [],
  neighborhoods: [],
  budget: 'moderate',
  pace: 'balanced',
  needsHotel: true,
  wantsNightlife: true,
  hasChildren: false,
};

export default function TripPlanner({ initialType }: { initialType?: string }) {
  const seed: TripInput = {
    ...DEFAULTS,
    tripType: (initialType && initialType in TRIP_TYPE_LABELS ? initialType : 'first-visit') as TripType,
  };
  const [input, setInput] = useState<TripInput>(seed);
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [started, setStarted] = useState(false);
  const [experienceCandidates, setExperienceCandidates] = useState<ExperienceCandidate[]>([]);
  const [placeCandidates, setPlaceCandidates] = useState<PlannerPlaceCandidate[]>([]);
  const [plannerContexts, setPlannerContexts] = useState<PlannerContextCandidate[]>([]);
  const [experiencesLoading, setExperiencesLoading] = useState(false);

  const days = useMemo(() => tripLength(input.startDate, input.endDate), [input.startDate, input.endDate]);
  const itinerary = useMemo(
    () => (submitted ? buildItinerary(input, experienceCandidates, plannerContexts, placeCandidates) : []),
    [submitted, input, experienceCandidates, plannerContexts, placeCandidates],
  );
  const hotelPicks = useMemo(() => (submitted && input.needsHotel ? suggestHotels(input) : []), [submitted, input]);

  useEffect(() => {
    if (!submitted) return;
    let cancelled = false;
    setExperiencesLoading(true);

    const experienceParams = new URLSearchParams({
      planner: '1',
      tripType: input.tripType,
      count: '12',
    });
    const contextParams = new URLSearchParams({ tripType: input.tripType });
    if (input.startDate) {
      experienceParams.set('startDate', input.startDate);
      contextParams.set('startDate', input.startDate);
    }
    if (input.endDate) {
      experienceParams.set('endDate', input.endDate);
      contextParams.set('endDate', input.endDate);
    }
    if (input.interests.length) experienceParams.set('interests', input.interests.join(','));

    Promise.all([
      fetch(`/api/experiences?${experienceParams.toString()}`)
        .then(async (res) => {
          if (!res.ok) return { experiences: [] as ExperienceCandidate[] };
          return res.json() as Promise<{ experiences?: ExperienceCandidate[] }>;
        })
        .catch(() => ({ experiences: [] as ExperienceCandidate[] })),
      fetch('/api/planner/places?limit=120')
        .then(async (res) => {
          if (!res.ok) return { places: [] as PlannerPlaceCandidate[] };
          return res.json() as Promise<{ places?: PlannerPlaceCandidate[] }>;
        })
        .catch(() => ({ places: [] as PlannerPlaceCandidate[] })),
      fetch(`/api/planner/context?${contextParams.toString()}`)
        .then(async (res) => {
          if (!res.ok) return { contexts: [] as PlannerContextCandidate[] };
          return res.json() as Promise<{ contexts?: PlannerContextCandidate[] }>;
        })
        .catch(() => ({ contexts: [] as PlannerContextCandidate[] })),
    ])
      .then(([experienceData, placeData, contextData]) => {
        if (cancelled) return;
        setExperienceCandidates(Array.isArray(experienceData.experiences) ? experienceData.experiences : []);
        // Only approved/published/active places with health gates — never discovery candidates.
        setPlaceCandidates(Array.isArray(placeData.places) ? placeData.places : []);
        setPlannerContexts(Array.isArray(contextData.contexts) ? contextData.contexts : []);
      })
      .finally(() => {
        if (!cancelled) setExperiencesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [submitted, input.tripType, input.interests, input.startDate, input.endDate]);

  function set<K extends keyof TripInput>(key: K, value: TripInput[K]) {
    if (!started) {
      setStarted(true);
      track(ANALYTICS_EVENTS.TRIP_PLANNER_STARTED, { trip_type: input.tripType });
    }
    setInput((prev) => ({ ...prev, [key]: value }));
  }

  function toggleArray<K extends 'interests' | 'neighborhoods'>(key: K, value: string) {
    const current = input[key] as string[];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    set(key, next as TripInput[K]);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setCopied(false);
    track(ANALYTICS_EVENTS.TRIP_PLANNER_COMPLETED, {
      trip_type: input.tripType,
      value: days,
      results_count: days,
    });
    window.setTimeout(() => {
      document.getElementById('itinerary-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  }

  return (
    <div>
      <form onSubmit={onSubmit} className="rounded-card border border-paper-edge bg-white p-5 lg:p-7">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="start" className="field-label">Arriving</label>
            <input id="start" type="date" className="field-input" value={input.startDate} onChange={(e) => set('startDate', e.target.value)} />
          </div>
          <div>
            <label htmlFor="end" className="field-label">Leaving</label>
            <input id="end" type="date" className="field-input" value={input.endDate} min={input.startDate || undefined} onChange={(e) => set('endDate', e.target.value)} />
            <p className="mt-1 text-2xs text-ink-faint">
              {input.startDate && input.endDate ? `${days} day${days === 1 ? '' : 's'}` : 'Defaults to 2 days'}
            </p>
          </div>

          <div>
            <label htmlFor="travelers" className="field-label">Travellers</label>
            <input id="travelers" type="number" min={1} max={30} className="field-input" value={input.travelers} onChange={(e) => set('travelers', Math.max(1, Number(e.target.value) || 1))} />
          </div>

          <div>
            <label htmlFor="tripType" className="field-label">Trip type</label>
            <select id="tripType" className="field-input" value={input.tripType} onChange={(e) => set('tripType', e.target.value as TripType)}>
              {(Object.keys(TRIP_TYPE_LABELS) as TripType[]).map((t) => <option key={t} value={t}>{TRIP_TYPE_LABELS[t]}</option>)}
            </select>
          </div>
        </div>

        <fieldset className="mt-7">
          <legend className="field-label">Interests</legend>
          <div className="flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map((opt) => {
              const on = input.interests.includes(opt);
              return (
                <label key={opt} className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-sm transition-colors ${on ? 'border-clay bg-clay text-white' : 'border-paper-edge bg-white text-ink-soft hover:border-clay'}`}>
                  <input type="checkbox" className="sr-only" checked={on} onChange={() => toggleArray('interests', opt)} />
                  {opt}
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="mt-7">
          <legend className="field-label">Preferred neighborhoods</legend>
          <p className="mb-2 text-2xs text-ink-faint">Leave blank and we will pick based on your trip type.</p>
          <div className="flex flex-wrap gap-2">
            {neighborhoods.map((n) => {
              const on = input.neighborhoods.includes(n.slug);
              return (
                <label key={n.slug} className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-sm transition-colors ${on ? 'border-clay bg-clay text-white' : 'border-paper-edge bg-white text-ink-soft hover:border-clay'}`}>
                  <input type="checkbox" className="sr-only" checked={on} onChange={() => toggleArray('neighborhoods', n.slug as NeighborhoodSlug)} />
                  {n.name}
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-7 grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="budget" className="field-label">Budget</label>
            <select id="budget" className="field-input" value={input.budget} onChange={(e) => set('budget', e.target.value as Budget)}>
              <option value="value">Value</option>
              <option value="moderate">Moderate</option>
              <option value="premium">Premium</option>
            </select>
          </div>
          <div>
            <label htmlFor="pace" className="field-label">Pace</label>
            <select id="pace" className="field-input" value={input.pace} onChange={(e) => set('pace', e.target.value as Pace)}>
              <option value="relaxed">Relaxed, three stops a day</option>
              <option value="balanced">Balanced, four stops a day</option>
              <option value="packed">Packed, five stops a day</option>
            </select>
          </div>
        </div>

        <fieldset className="mt-7">
          <legend className="field-label">A few more things</legend>
          <div className="space-y-2.5">
            {([
              ['needsHotel', 'I need a hotel'],
              ['wantsNightlife', 'I want nightlife in the plan'],
              ['hasChildren', 'We are travelling with children'],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2.5 text-[15px] text-ink-soft">
                <input type="checkbox" className="h-4 w-4 rounded border-paper-edge text-clay focus:ring-clay" checked={input[key]} onChange={(e) => set(key, e.target.checked)} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <button type="submit" className="btn-primary mt-8 w-full sm:w-auto">{submitted ? 'Rebuild itinerary' : 'Build my itinerary'}</button>
        <p className="mt-3 text-2xs text-ink-faint">Plans are assembled from published records and Nashroam context rules, not generated prose.</p>
      </form>

      {submitted && (
        <section id="itinerary-result" aria-live="polite" className="mt-12">
          {itinerary.some((day) => day.stops.some((stop) => stop.isSample)) && (
            <div className="mb-4 rounded-card border border-clay/25 bg-clay-wash/30 p-4 text-sm leading-relaxed text-clay-deep">
              <strong className="font-semibold">Some stops are samples.</strong> Stops marked
              &ldquo;Sample&rdquo; are demonstration records, not real businesses — we have not
              published verified places in that category yet. Everything else in this plan is real.
            </div>
          )}
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-paper-edge pb-4">
            <div>
              <p className="eyebrow mb-1">Your plan</p>
              <h2 className="text-3xl">{days} day{days === 1 ? '' : 's'} in Nashville</h2>
              <p className="mt-1 text-[15px] text-ink-soft">
                {TRIP_TYPE_LABELS[input.tripType]} · {input.travelers} traveller{input.travelers === 1 ? '' : 's'} · {input.pace} pace
                {experiencesLoading
                  ? ' · loading live planning context…'
                  : experienceCandidates.length > 0
                    ? ` · ${experienceCandidates.length} bookable experience${experienceCandidates.length === 1 ? '' : 's'} available`
                    : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-secondary" onClick={() => { window.print(); track(ANALYTICS_EVENTS.ITINERARY_SAVED, { trip_type: input.tripType, value: days }); }}>Print plan</button>
              <button
                type="button"
                className="btn-secondary"
                onClick={async () => {
                  const params = new URLSearchParams({ type: input.tripType, days: String(days), travelers: String(input.travelers), pace: input.pace });
                  const url = `${window.location.origin}/plan/?${params.toString()}`;
                  try { await navigator.clipboard.writeText(url); setCopied(true); } catch { setCopied(false); }
                  track(ANALYTICS_EVENTS.ITINERARY_EMAILED, { trip_type: input.tripType, value: days });
                }}
              >
                Copy link
              </button>
              <button type="button" className="btn-quiet" onClick={() => setSubmitted(false)}>Edit answers</button>
            </div>
          </div>

          {copied && (
            <p role="status" className="mt-4 rounded border border-moss/20 bg-moss-wash p-3 text-sm text-moss">
              Link copied. Share it to reopen the planner with these trip settings.
            </p>
          )}

          <div className="mt-8 space-y-10">
            {itinerary.map((day) => (
              <article key={day.dayNumber}>
                <header className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="font-sans text-2xl font-bold">Day {day.dayNumber}</h3>
                  {day.date && <span className="text-sm text-ink-faint">{formatDate(day.date)}</span>}
                  <span className="text-sm text-ink-faint">· {day.theme}</span>
                </header>

                {day.guidance.length > 0 && (
                  <div className="mb-4 rounded-card border border-clay/20 bg-paper-card p-4">
                    <p className="eyebrow text-clay">Nashroam context</p>
                    <div className="mt-2 space-y-2">
                      {day.guidance.map((item) => (
                        <div key={item.title}>
                          <p className="text-sm font-semibold text-navy">{item.title}</p>
                          <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">{item.note}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <ol className="space-y-4">
                  {day.stops.map((stop, i) => (
                    <li key={`${stop.slot}-${i}`} className="rounded-card border border-paper-edge bg-white p-4">
                      <div className="flex flex-wrap items-baseline gap-x-3">
                        <span className="eyebrow text-clay">{stop.slot}</span>
                        <span className="text-2xs text-ink-faint">{stop.neighborhood}</span>
                        {stop.isSample && (
                          <span className="rounded border border-clay/25 bg-clay-wash/40 px-1.5 py-0.5 text-2xs font-bold uppercase tracking-wider text-clay-deep">
                            Sample — not a real business
                          </span>
                        )}
                      </div>
                      <h4 className="mt-1 font-sans text-lg font-bold">
                        {stop.href ? <Link href={stop.href} className="hover:text-clay">{stop.title}</Link> : stop.title}
                      </h4>
                      <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">{stop.note}</p>

                      <dl className="mt-3 space-y-1 text-sm">
                        {stop.travelNote && <div className="flex gap-2"><dt className="font-semibold text-ink">Getting there.</dt><dd className="text-ink-soft">{stop.travelNote}</dd></div>}
                        {stop.reservationNote && <div className="flex gap-2"><dt className="font-semibold text-ink">Booking.</dt><dd className="text-ink-soft">{stop.reservationNote}</dd></div>}
                      </dl>

                      <div className="mt-3 flex flex-wrap items-center gap-4"><MapLink query={stop.mapQuery} label="Map" /></div>

                      {stop.alternatives.length > 0 && (
                        <details className="mt-3 border-t border-paper-edge pt-3">
                          <summary className="cursor-pointer text-sm font-semibold text-ink-soft hover:text-clay">Alternatives ({stop.alternatives.length})</summary>
                          <ul className="mt-2 space-y-2">
                            {stop.alternatives.map((alt) => (
                              <li key={alt.title} className="text-sm">
                                {alt.href ? <Link href={alt.href} className="font-semibold text-clay hover:underline">{alt.title}</Link> : <span className="font-semibold">{alt.title}</span>}
                                <span className="block text-ink-soft">{alt.note}</span>
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>

          {hotelPicks.length > 0 && (
            <section className="mt-12 border-t border-paper-edge pt-8">
              <h3 className="text-2xl">Where to stay for this trip</h3>
              <p className="mt-1 text-[15px] text-ink-soft">Matched to your neighborhoods and budget.</p>
              <ul className="mt-4 grid gap-4 sm:grid-cols-3">
                {hotelPicks.map((h) => (
                  <li key={h.slug} className="rounded-card border border-paper-edge bg-white p-4">
                    <Link href={`/hotels/${h.slug}/`} className="font-sans text-lg font-bold hover:text-clay">{h.title}</Link>
                    <p className="mt-1 text-sm text-ink-soft">{h.summary}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </section>
      )}
    </div>
  );
}
