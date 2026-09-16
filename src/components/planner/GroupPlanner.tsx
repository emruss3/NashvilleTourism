'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { BottleIcon, BriefcaseIcon, GlassIcon, HeartIcon, KidsIcon, PeopleIcon, RingIcon, SparkleIcon } from '@/components/Icons';
import { MapLink } from '@/components/Ui';
import { formatDate } from '@/components/Trust';
import { useSaved } from '@/components/useSaved';
import { ANALYTICS_EVENTS, track } from '@/lib/analytics';
import { neighborhoods } from '@/lib/content/neighborhoods';
import {
  AGE_BANDS,
  BUDGET_PRESETS,
  DEFAULT_PROFILE,
  OCCASIONS,
  PACES,
  STYLE_QUESTIONS,
  TRANSPORT,
  UNIVERSAL_INTERESTS,
  groupBudget,
  hasChildren,
  mustDoList,
  outstandingChecks,
  perPersonBudget,
  profileRecap,
  profileToTripInput,
} from '@/lib/group-planner';
import {
  buildItinerary,
  suggestHotels,
  tripLength,
  type ExperienceCandidate,
  type PlannerContextCandidate,
  type PlannerEventCandidate,
  type PlannerPlaceCandidate,
} from '@/lib/itinerary';
import type { AgeBand, GroupProfile, ItineraryStop, Occasion, Pace } from '@/lib/types';

const OCCASION_ICONS: Record<Occasion, (p: { size?: number }) => React.ReactElement> = {
  bachelorette: GlassIcon,
  bachelor: BottleIcon,
  friends: PeopleIcon,
  family: KidsIcon,
  couples: HeartIcon,
  corporate: BriefcaseIcon,
  other: SparkleIcon,
};

type Step = 1 | 2 | 3;
type StopKey = string;

interface StopOverride {
  locked?: ItineraryStop;
  altIndex?: number;
}

const PACE_ORDER: Pace[] = ['packed', 'balanced', 'relaxed'];

/**
 * Group-optimized planner (GROUP-TRIP-PLANNER.md, page-designs/README.md §08).
 *
 * Three steps: Your group, Your style, Your plan. The draft is assembled by
 * the deterministic engine in itinerary.ts from approved records and live
 * planning context, ranked by the group profile. Hard facts the data cannot
 * confirm (capacity for a large party, hours on undecided dates, live
 * availability) are listed as outstanding checks rather than assumed.
 * Keep, Swap, Make it more relaxed, Lower the budget and Rebuild this day
 * are controlled changes: locked stops survive every rebuild. Saving is a
 * local draft in this browser; nothing here reserves anything.
 */
export default function GroupPlanner({
  initialOccasion,
  initialStart,
  initialEnd,
  initialPeople,
}: {
  initialOccasion?: Occasion;
  initialStart?: string;
  initialEnd?: string;
  initialPeople?: number;
}) {
  const [profile, setProfile] = useState<GroupProfile>({
    ...DEFAULT_PROFILE,
    occasion: initialOccasion ?? DEFAULT_PROFILE.occasion,
    startDate: initialStart ?? '',
    endDate: initialEnd ?? '',
    headcount: initialPeople ?? DEFAULT_PROFILE.headcount,
  });
  const [step, setStep] = useState<Step>(1);
  const [built, setBuilt] = useState(false);
  const [started, setStarted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [overrides, setOverrides] = useState<Record<StopKey, StopOverride>>({});
  const [activeDay, setActiveDay] = useState(1);
  const [experienceCandidates, setExperienceCandidates] = useState<ExperienceCandidate[]>([]);
  const [placeCandidates, setPlaceCandidates] = useState<PlannerPlaceCandidate[]>([]);
  const [eventCandidates, setEventCandidates] = useState<PlannerEventCandidate[]>([]);
  const [plannerContexts, setPlannerContexts] = useState<PlannerContextCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const { items: saved } = useSaved();

  const input = useMemo(() => profileToTripInput(profile), [profile]);
  const days = useMemo(() => tripLength(input.startDate, input.endDate), [input.startDate, input.endDate]);
  const draft = useMemo(
    () => (built ? buildItinerary(input, experienceCandidates, plannerContexts, placeCandidates, eventCandidates) : []),
    [built, input, experienceCandidates, plannerContexts, placeCandidates, eventCandidates],
  );
  const hotelPicks = useMemo(() => (built && input.needsHotel ? suggestHotels(input) : []), [built, input]);

  // Apply locks and swaps on top of the regenerated draft.
  const itinerary = useMemo(
    () =>
      draft.map((day) => ({
        ...day,
        stops: day.stops.map((stop) => {
          const key = `${day.dayNumber}-${stop.slot}`;
          const o = overrides[key];
          if (o?.locked) return o.locked;
          if (o?.altIndex != null && stop.alternatives[o.altIndex]) {
            const alt = stop.alternatives[o.altIndex];
            return { ...stop, title: alt.title, href: alt.href, note: alt.note, fit: [], costNote: undefined, availability: 'suggested' as const, mapQuery: `${alt.title}, Nashville, TN` };
          }
          return stop;
        }),
      })),
    [draft, overrides],
  );

  useEffect(() => {
    if (!built) return;
    let cancelled = false;
    setLoading(true);
    const experienceParams = new URLSearchParams({ planner: '1', tripType: input.tripType, count: '12' });
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
    const eventParams = new URLSearchParams({ limit: '40' });
    if (input.startDate) eventParams.set('startDate', input.startDate);
    if (input.endDate) eventParams.set('endDate', input.endDate);

    const get = async <T,>(url: string, key: string): Promise<T[]> => {
      try {
        const res = await fetch(url);
        if (!res.ok) return [];
        const data = (await res.json()) as Record<string, unknown>;
        return Array.isArray(data[key]) ? (data[key] as T[]) : [];
      } catch {
        return [];
      }
    };

    Promise.all([
      get<ExperienceCandidate>(`/api/experiences?${experienceParams}`, 'experiences'),
      get<PlannerPlaceCandidate>('/api/planner/places?limit=120', 'places'),
      get<PlannerContextCandidate>(`/api/planner/context?${contextParams}`, 'contexts'),
      get<PlannerEventCandidate>(`/api/planner/events?${eventParams}`, 'events'),
    ])
      .then(([experiences, places, contexts, events]) => {
        if (cancelled) return;
        setExperienceCandidates(experiences);
        setPlaceCandidates(places);
        setPlannerContexts(contexts);
        setEventCandidates(events);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [built, input.tripType, input.interests, input.startDate, input.endDate]);

  function set<K extends keyof GroupProfile>(key: K, value: GroupProfile[K]) {
    if (!started) {
      setStarted(true);
      track(ANALYTICS_EVENTS.TRIP_PLANNER_STARTED, { trip_type: profile.occasion });
    }
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  function toggleIn<K extends 'ageBands' | 'interests'>(key: K, value: string) {
    const current = profile[key] as string[];
    set(key, (current.includes(value) ? current.filter((v) => v !== value) : [...current, value]) as GroupProfile[K]);
  }

  function toggleAnswer(id: string, value: string) {
    const current = profile.answers[id];
    const list = Array.isArray(current) ? current : [];
    set('answers', { ...profile.answers, [id]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] });
  }

  function answerText(id: string): string {
    const v = profile.answers[id];
    return typeof v === 'string' ? v : '';
  }

  function build() {
    setBuilt(true);
    setStep(3);
    setCopied(false);
    setActiveDay(1);
    track(ANALYTICS_EVENTS.TRIP_PLANNER_COMPLETED, { trip_type: profile.occasion, value: days, results_count: days });
    window.setTimeout(() => document.getElementById('your-plan')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  }

  function lock(dayNumber: number, stop: ItineraryStop) {
    const key = `${dayNumber}-${stop.slot}`;
    setOverrides((prev) => {
      const next = { ...prev };
      if (next[key]?.locked) delete next[key];
      else next[key] = { locked: stop };
      return next;
    });
  }

  function swap(dayNumber: number, stop: ItineraryStop, original: ItineraryStop) {
    const key = `${dayNumber}-${stop.slot}`;
    if (original.alternatives.length === 0) return;
    setOverrides((prev) => {
      const current = prev[key]?.altIndex;
      const next = current == null ? 0 : current + 1 >= original.alternatives.length ? undefined : current + 1;
      return { ...prev, [key]: { ...prev[key], locked: undefined, altIndex: next } };
    });
  }

  function rebuildDay(dayNumber: number) {
    setOverrides((prev) => {
      const next = { ...prev };
      for (const stop of draft.find((d) => d.dayNumber === dayNumber)?.stops ?? []) {
        const key = `${dayNumber}-${stop.slot}`;
        if (next[key]?.locked) continue;
        if (stop.alternatives.length === 0) continue;
        const current = next[key]?.altIndex;
        next[key] = { altIndex: current == null ? 0 : current + 1 >= stop.alternatives.length ? undefined : current + 1 };
      }
      return next;
    });
  }

  function relax() {
    const i = PACE_ORDER.indexOf(profile.pace);
    if (i < PACE_ORDER.length - 1) set('pace', PACE_ORDER[i + 1]);
  }

  function lowerBudget() {
    const pp = perPersonBudget(profile);
    const current = pp ?? 175;
    const lower = [...BUDGET_PRESETS].reverse().find((b) => b.value < current)?.value ?? BUDGET_PRESETS[0].value;
    setProfile((prev) => ({ ...prev, budgetMode: 'per-person', budgetValue: lower }));
  }

  const questions = STYLE_QUESTIONS[profile.occasion];
  const checks = outstandingChecks(profile);
  const mustDos = mustDoList(profile);
  const lockedCount = Object.values(overrides).filter((o) => o.locked).length;
  const knownCosts = itinerary.flatMap((d) => d.stops).filter((s) => s.costNote?.startsWith('From'));
  const unpriced = itinerary.flatMap((d) => d.stops).length - knownCosts.length;
  const pp = perPersonBudget(profile);
  const gb = groupBudget(profile);
  const stepTitles: Record<Step, string> = { 1: 'Your group', 2: 'Your style', 3: 'Your plan' };

  return (
    <div>
      <ol className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px]" aria-label="Planner steps">
        {([1, 2, 3] as Step[]).map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            {s < step || (s === 3 && built) ? (
              <button type="button" onClick={() => setStep(s)} className="inline-flex min-h-11 items-center gap-2 font-semibold text-ink underline-offset-[0.2em] hover:underline">
                <StepDot n={s} active={s === step} />
                {stepTitles[s]}
              </button>
            ) : (
              <span className={`inline-flex min-h-11 items-center gap-2 ${s === step ? 'font-semibold text-ink' : 'text-ink-soft'}`} aria-current={s === step ? 'step' : undefined}>
                <StepDot n={s} active={s === step} />
                {stepTitles[s]}
              </span>
            )}
            {i < 2 ? <span aria-hidden="true" className="hidden h-px w-8 bg-paper-edge sm:block" /> : null}
          </li>
        ))}
      </ol>

      {step === 1 ? (
        <form
          className="mt-5"
          onSubmit={(e) => {
            e.preventDefault();
            setStep(2);
          }}
        >
          <fieldset>
            <legend className="text-[1.75rem] font-extrabold tracking-[-0.03em] sm:text-[2.25rem]">What brings you together?</legend>
            <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
              {OCCASIONS.map((o) => {
                const Icon = OCCASION_ICONS[o.value];
                const on = profile.occasion === o.value;
                return (
                  <li key={o.value}>
                    <label className={`flex min-h-[5.5rem] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-card border px-2 py-3 text-center text-[15px] font-semibold transition-colors ${on ? 'border-ink bg-ink text-paper' : 'border-ink-soft text-ink hover:border-ink'}`}>
                      <input type="radio" name="occasion" value={o.value} checked={on} onChange={() => set('occasion', o.value)} className="sr-only" />
                      <Icon size={22} />
                      {o.label}
                    </label>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-sm text-ink-soft">{OCCASIONS.find((o) => o.value === profile.occasion)?.hint}</p>
          </fieldset>

          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="headcount" className="field-label">
                How many people?
              </label>
              <input id="headcount" type="number" min={1} max={60} inputMode="numeric" className="field-input" value={profile.headcount} onChange={(e) => set('headcount', Math.min(60, Math.max(1, Number(e.target.value) || 1)))} />
            </div>
            <div className="sm:col-span-1 lg:col-span-3">
              <fieldset>
                <legend className="field-label">Age ranges in the group</legend>
                <p className="mb-2 text-2xs text-ink-soft">Pick every band that applies; mixed-age groups are normal.</p>
                <div className="flex flex-wrap gap-2">
                  {AGE_BANDS.map((band) => {
                    const on = profile.ageBands.includes(band.value);
                    return (
                      <label key={band.value} className={`inline-flex min-h-11 cursor-pointer items-center rounded border px-3.5 text-sm transition-colors ${on ? 'border-ink bg-ink text-paper' : 'border-ink-soft text-ink hover:border-ink'}`}>
                        <input type="checkbox" className="sr-only" checked={on} onChange={() => toggleIn('ageBands', band.value as AgeBand)} />
                        {band.label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </div>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="start" className="field-label">
                Arriving
              </label>
              <input id="start" type="date" className="field-input" value={profile.startDate} disabled={profile.datesUndecided} onChange={(e) => set('startDate', e.target.value)} />
            </div>
            <div>
              <label htmlFor="end" className="field-label">
                Leaving
              </label>
              <input id="end" type="date" className="field-input" value={profile.endDate} min={profile.startDate || undefined} disabled={profile.datesUndecided} onChange={(e) => set('endDate', e.target.value)} />
              <label className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
                <input type="checkbox" className="h-4 w-4" checked={profile.datesUndecided} onChange={(e) => set('datesUndecided', e.target.checked)} />
                Dates not decided yet
              </label>
            </div>
            <div>
              <label htmlFor="stay" className="field-label">
                Where are you staying?
              </label>
              <select id="stay" className="field-input" value={profile.stayNeighborhood} onChange={(e) => set('stayNeighborhood', e.target.value as GroupProfile['stayNeighborhood'])}>
                <option value="">Not booked yet</option>
                {neighborhoods.map((n) => (
                  <option key={n.slug} value={n.slug}>
                    {n.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="transport" className="field-label">
                Getting around
              </label>
              <select id="transport" className="field-input" value={profile.transport} onChange={(e) => set('transport', e.target.value as GroupProfile['transport'])}>
                {TRANSPORT.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <fieldset className="mt-6 rounded-card border border-paper-edge p-4">
            <legend className="field-label px-1">Budget</legend>
            <div className="grid gap-4 md:grid-cols-[auto_1fr] md:items-start">
              <div className="flex flex-wrap gap-2">
                {(['per-person', 'group'] as const).map((mode) => (
                  <label key={mode} className={`inline-flex min-h-11 cursor-pointer items-center rounded border px-3.5 text-sm ${profile.budgetMode === mode ? 'border-ink bg-ink text-paper' : 'border-ink-soft text-ink'}`}>
                    <input type="radio" name="budgetMode" className="sr-only" checked={profile.budgetMode === mode} onChange={() => set('budgetMode', mode)} />
                    {mode === 'per-person' ? 'Per person' : 'Whole group'}
                  </label>
                ))}
              </div>
              <div>
                {profile.budgetMode === 'per-person' ? (
                  <div className="flex flex-wrap gap-2">
                    {BUDGET_PRESETS.map((b) => (
                      <label key={b.value} className={`inline-flex min-h-11 cursor-pointer items-center rounded border px-3.5 text-sm ${profile.budgetValue === b.value ? 'border-ink bg-ink text-paper' : 'border-ink-soft text-ink hover:border-ink'}`}>
                        <input type="radio" name="budget" className="sr-only" checked={profile.budgetValue === b.value} onChange={() => set('budgetValue', b.value)} />
                        {b.label}
                      </label>
                    ))}
                    <label className={`inline-flex min-h-11 cursor-pointer items-center rounded border px-3.5 text-sm ${profile.budgetValue == null ? 'border-ink bg-ink text-paper' : 'border-ink-soft text-ink hover:border-ink'}`}>
                      <input type="radio" name="budget" className="sr-only" checked={profile.budgetValue == null} onChange={() => set('budgetValue', null)} />
                      Not sure
                    </label>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <label htmlFor="group-budget" className="sr-only">
                      Total group budget in dollars
                    </label>
                    <span className="text-[15px]">$</span>
                    <input id="group-budget" type="number" min={0} step={50} inputMode="numeric" className="field-input w-40" value={profile.budgetValue ?? ''} onChange={(e) => set('budgetValue', e.target.value === '' ? null : Number(e.target.value))} />
                    <span className="text-sm text-ink-soft">{pp != null ? `About $${pp} per person for ${profile.headcount}` : 'for the whole group'}</span>
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-4 text-sm">
                  {(
                    [
                      ['activities-dining', 'Activities and dining only'],
                      ['all-in', 'Including accommodation'],
                    ] as const
                  ).map(([scope, label]) => (
                    <label key={scope} className="inline-flex min-h-11 items-center gap-2">
                      <input type="radio" name="budgetScope" className="h-4 w-4" checked={profile.budgetScope === scope} onChange={() => set('budgetScope', scope)} />
                      {label}
                    </label>
                  ))}
                </div>
                {profile.budgetMode === 'per-person' && gb != null ? <p className="mt-1 text-2xs text-ink-soft">About ${gb.toLocaleString()} for the whole group.</p> : null}
              </div>
            </div>
          </fieldset>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button type="submit" className="btn-primary">
              Continue
              <span aria-hidden="true">→</span>
            </button>
            <p className="text-2xs text-ink-soft">No names or contact details are needed to see a draft.</p>
          </div>
        </form>
      ) : null}

      {step === 2 ? (
        <form
          className="mt-5"
          onSubmit={(e) => {
            e.preventDefault();
            build();
          }}
        >
          <h3 className="text-[1.75rem] font-extrabold tracking-[-0.03em] sm:text-[2.25rem]">Your style.</h3>
          <p className="mt-1 text-[15px] text-ink-soft">
            Questions for a {OCCASIONS.find((o) => o.value === profile.occasion)?.label.toLowerCase()} trip. Specific answers beat occasion defaults every time.
          </p>

          <div className="mt-5 space-y-6">
            {questions.map((qn) => (
              <div key={qn.id}>
                {qn.type === 'chips' ? (
                  <fieldset>
                    <legend className="field-label">{qn.label}</legend>
                    {qn.hint ? <p className="mb-2 text-2xs text-ink-soft">{qn.hint}</p> : null}
                    <div className="flex flex-wrap gap-2">
                      {qn.options?.map((opt) => {
                        const on = (profile.answers[qn.id] as string[] | undefined)?.includes(opt);
                        return (
                          <label key={opt} className={`inline-flex min-h-11 cursor-pointer items-center rounded border px-3.5 text-sm transition-colors ${on ? 'border-ink bg-ink text-paper' : 'border-ink-soft text-ink hover:border-ink'}`}>
                            <input type="checkbox" className="sr-only" checked={Boolean(on)} onChange={() => toggleAnswer(qn.id, opt)} />
                            {opt}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                ) : (
                  <div>
                    <label htmlFor={`q-${qn.id}`} className="field-label">
                      {qn.label}
                    </label>
                    {qn.hint ? <p className="mb-2 text-2xs text-ink-soft">{qn.hint}</p> : null}
                    <input id={`q-${qn.id}`} type="text" className="field-input" placeholder={qn.placeholder} value={answerText(qn.id)} onChange={(e) => set('answers', { ...profile.answers, [qn.id]: e.target.value })} />
                  </div>
                )}
              </div>
            ))}

            <fieldset>
              <legend className="field-label">Interests</legend>
              <div className="flex flex-wrap gap-2">
                {UNIVERSAL_INTERESTS.map((opt) => {
                  const on = profile.interests.includes(opt);
                  return (
                    <label key={opt} className={`inline-flex min-h-11 cursor-pointer items-center rounded border px-3.5 text-sm transition-colors ${on ? 'border-ink bg-ink text-paper' : 'border-ink-soft text-ink hover:border-ink'}`}>
                      <input type="checkbox" className="sr-only" checked={on} onChange={() => toggleIn('interests', opt)} />
                      {opt}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="pace" className="field-label">
                  Trip pace
                </label>
                <select id="pace" className="field-input" value={profile.pace} onChange={(e) => set('pace', e.target.value as Pace)}>
                  {PACES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="mustDos" className="field-label">
                  Must-do stops (optional)
                </label>
                <input id="mustDos" type="text" className="field-input" placeholder="Live music, a rooftop, a specific bar…" value={profile.mustDos} onChange={(e) => set('mustDos', e.target.value)} />
              </div>
              <div>
                <label htmlFor="dietary" className="field-label">
                  Food restrictions (optional)
                </label>
                <input id="dietary" type="text" className="field-input" placeholder="Vegetarian, gluten-free, halal…" value={profile.dietary} onChange={(e) => set('dietary', e.target.value)} />
              </div>
              <div>
                <label htmlFor="accessibility" className="field-label">
                  Accessibility needs (optional)
                </label>
                <input id="accessibility" type="text" className="field-input" placeholder="Step-free access, seating, quiet rooms…" value={profile.accessibility} onChange={(e) => set('accessibility', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="avoid" className="field-label">
                  Anything to avoid? (optional)
                </label>
                <input id="avoid" type="text" className="field-input" placeholder="Crowded bars, long drives, early mornings…" value={profile.avoid} onChange={(e) => set('avoid', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button type="button" className="btn-quiet" onClick={() => setStep(1)}>
              Back
            </button>
            <button type="submit" className="btn-primary">
              Build our trip
              <span aria-hidden="true">→</span>
            </button>
          </div>
          <p className="mt-3 max-w-prose text-2xs text-ink-soft">
            The draft uses the answers above and our published records. Reservations, tickets and rooms are booked separately with each provider; nothing here is reserved.
          </p>
        </form>
      ) : null}

      {step === 3 && built ? (
        <section id="your-plan" aria-live="polite" className="mt-5 scroll-mt-24">
          <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)_300px] lg:gap-10">
            {/* Group summary */}
            <aside className="order-1 lg:order-none">
              <p className="eyebrow">Your group</p>
              <p className="mt-1 text-[17px] font-semibold text-ink">{profileRecap(profile)}</p>
              <dl className="mt-3 space-y-1.5 text-sm text-ink-soft">
                <div>
                  <dt className="inline font-semibold text-ink">Dates. </dt>
                  <dd className="inline">{profile.datesUndecided || !profile.startDate ? 'Not set (2-day outline)' : `${formatDate(profile.startDate)}${profile.endDate ? ` to ${formatDate(profile.endDate)}` : ''}`}</dd>
                </div>
                <div>
                  <dt className="inline font-semibold text-ink">Budget. </dt>
                  <dd className="inline">
                    {pp != null ? `About $${pp} per person, ${profile.budgetScope === 'all-in' ? 'including accommodation' : 'activities and dining'}` : 'Not set'}
                  </dd>
                </div>
                <div>
                  <dt className="inline font-semibold text-ink">Staying. </dt>
                  <dd className="inline">{profile.stayNeighborhood ? neighborhoods.find((n) => n.slug === profile.stayNeighborhood)?.name : 'Not booked yet'}</dd>
                </div>
                {hasChildren(profile) ? (
                  <div>
                    <dt className="inline font-semibold text-ink">Children. </dt>
                    <dd className="inline">Age-restricted nightlife is excluded from shared stops.</dd>
                  </div>
                ) : null}
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className="btn-secondary min-h-11 px-4 text-sm" onClick={() => setStep(1)}>
                  Edit group
                </button>
                <button type="button" className="btn-secondary min-h-11 px-4 text-sm" onClick={() => setStep(2)}>
                  Edit style
                </button>
              </div>

              <div className="mt-6 border-t border-paper-edge pt-4">
                <p className="eyebrow">Refine</p>
                <div className="mt-2 grid gap-2">
                  <button type="button" className="btn-tertiary min-h-11 justify-start text-sm" onClick={relax} disabled={profile.pace === 'relaxed'}>
                    Make it more relaxed
                  </button>
                  <button type="button" className="btn-tertiary min-h-11 justify-start text-sm" onClick={lowerBudget} disabled={pp != null && pp <= BUDGET_PRESETS[0].value}>
                    Lower the budget
                  </button>
                </div>
                <p className="mt-2 text-2xs text-ink-soft">
                  {lockedCount > 0 ? `${lockedCount} locked ${lockedCount === 1 ? 'stop stays' : 'stops stay'} where ${lockedCount === 1 ? 'it is' : 'they are'} through every change.` : 'Use Keep on any stop to lock it before you change pace or budget.'}
                </p>
              </div>
            </aside>

            {/* Day by day */}
            <div className="order-3 min-w-0 lg:order-none">
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-paper-edge pb-3">
                <div>
                  <p className="eyebrow">Your tailored plan</p>
                  <h3 className="mt-1 text-[1.75rem] font-extrabold tracking-[-0.03em] sm:text-[2rem]">
                    {days} {days === 1 ? 'day' : 'days'} built for your group.
                  </h3>
                  <p className="mt-1 text-sm text-ink-soft">
                    {loading ? 'Loading live planning context…' : `${experienceCandidates.length} bookable ${experienceCandidates.length === 1 ? 'experience' : 'experiences'} and ${placeCandidates.length} approved places considered.`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-secondary min-h-11 px-4 text-sm"
                    onClick={() => {
                      window.print();
                      track(ANALYTICS_EVENTS.ITINERARY_SAVED, { trip_type: profile.occasion, value: days });
                    }}
                  >
                    Print
                  </button>
                  <button
                    type="button"
                    className="btn-secondary min-h-11 px-4 text-sm"
                    onClick={async () => {
                      const params = new URLSearchParams({ occasion: profile.occasion, people: String(profile.headcount) });
                      if (profile.startDate && !profile.datesUndecided) params.set('start', profile.startDate);
                      if (profile.endDate && !profile.datesUndecided) params.set('end', profile.endDate);
                      try {
                        await navigator.clipboard.writeText(`${window.location.origin}/plan/?${params}`);
                        setCopied(true);
                      } catch {
                        setCopied(false);
                      }
                      track(ANALYTICS_EVENTS.ITINERARY_EMAILED, { trip_type: profile.occasion, value: days });
                    }}
                  >
                    Copy link
                  </button>
                </div>
              </div>
              {copied ? (
                <p role="status" className="mt-3 rounded border border-ink bg-paper-sunk p-3 text-sm text-ink">
                  Link copied. It reopens the planner with this group; the draft itself is saved only in this browser.
                </p>
              ) : null}

              {itinerary.length > 1 ? (
                <div role="tablist" aria-label="Days" className="mt-4 flex gap-1 overflow-x-auto border-b border-paper-edge lg:hidden">
                  {itinerary.map((day) => (
                    <button
                      key={day.dayNumber}
                      role="tab"
                      aria-selected={activeDay === day.dayNumber}
                      onClick={() => setActiveDay(day.dayNumber)}
                      className={`inline-flex min-h-11 shrink-0 items-center border-b-2 px-3 text-[15px] font-semibold ${activeDay === day.dayNumber ? 'border-ink text-ink' : 'border-transparent text-ink-soft'}`}
                    >
                      Day {day.dayNumber}
                      {day.date ? <span className="ml-1.5 text-2xs font-medium text-ink-soft">{formatDate(day.date).replace(/, \d{4}$/, '')}</span> : null}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="mt-6 space-y-10">
                {itinerary.map((day, dayIndex) => (
                  <article key={day.dayNumber} className={activeDay === day.dayNumber ? '' : 'hidden lg:block'}>
                    <header className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <div className="flex flex-wrap items-baseline gap-x-3">
                        <h4 className="text-[1.375rem] font-extrabold tracking-[-0.03em]">Day {day.dayNumber}</h4>
                        {day.date ? <span className="text-sm text-ink-soft">{formatDate(day.date)}</span> : null}
                        <span className="text-sm text-ink-soft">· {day.theme}</span>
                      </div>
                      <button type="button" className="inline-flex min-h-11 items-center text-sm font-semibold text-ink underline-offset-[0.2em] hover:underline" onClick={() => rebuildDay(day.dayNumber)}>
                        Rebuild this day
                      </button>
                    </header>

                    {day.guidance.length > 0 ? (
                      <div className="mb-3 rounded-card border border-paper-edge bg-paper-sunk p-4">
                        <p className="eyebrow">Local context</p>
                        <div className="mt-2 space-y-2">
                          {day.guidance.map((item) => (
                            <div key={item.title}>
                              <p className="text-sm font-semibold text-ink">{item.title}</p>
                              <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">{item.note}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <ol className="space-y-3">
                      {day.stops.map((stop, i) => {
                        const original = draft[dayIndex]?.stops[i] ?? stop;
                        const key = `${day.dayNumber}-${stop.slot}`;
                        const locked = Boolean(overrides[key]?.locked);
                        return (
                          <li key={key} className={`rounded-card border p-4 ${locked ? 'border-ink' : 'border-paper-edge'}`}>
                            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                              <span className="eyebrow">{stop.slot}</span>
                              <span className="text-2xs text-ink-soft">{stop.neighborhood}</span>
                              {stop.isSample ? <span className="rounded border border-ink px-1.5 py-0.5 text-2xs font-bold uppercase tracking-wider">Sample, not a real business</span> : null}
                              {locked ? <span className="rounded border border-ink bg-ink px-1.5 py-0.5 text-2xs font-bold uppercase tracking-wider text-paper">Kept</span> : null}
                            </div>
                            <h5 className="mt-1 font-sans text-[17px] font-bold">
                              {stop.href ? (
                                <Link href={stop.href} className="underline-offset-[0.2em] hover:underline">
                                  {stop.title}
                                </Link>
                              ) : (
                                stop.title
                              )}
                            </h5>
                            <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">{stop.note}</p>
                            {stop.fit && stop.fit.length > 0 ? (
                              <ul className="mt-2 flex flex-wrap gap-1.5">
                                {stop.fit.map((f) => (
                                  <li key={f} className="rounded border border-paper-edge bg-paper-sunk px-2 py-0.5 text-2xs font-medium text-ink">
                                    {f}
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                            <dl className="mt-3 space-y-1 text-sm">
                              {stop.travelNote ? (
                                <div className="flex gap-2">
                                  <dt className="shrink-0 font-semibold text-ink">Getting there.</dt>
                                  <dd className="text-ink-soft">{stop.travelNote}</dd>
                                </div>
                              ) : null}
                              <div className="flex gap-2">
                                <dt className="shrink-0 font-semibold text-ink">Cost.</dt>
                                <dd className="text-ink-soft">{stop.costNote ?? 'Not priced here; check with the venue.'}</dd>
                              </div>
                              <div className="flex gap-2">
                                <dt className="shrink-0 font-semibold text-ink">Availability.</dt>
                                <dd className="text-ink-soft">
                                  {stop.availability === 'check-provider' ? 'Check dates with the provider before you count on it.' : 'Suggested. Not checked; confirm hours and capacity.'}
                                  {stop.reservationNote ? ` ${stop.reservationNote}` : ''}
                                </dd>
                              </div>
                            </dl>
                            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                              <button type="button" aria-pressed={locked} className={`inline-flex min-h-11 items-center text-sm font-semibold underline-offset-[0.2em] hover:underline ${locked ? 'text-ink' : 'text-ink-soft'}`} onClick={() => lock(day.dayNumber, stop)}>
                                {locked ? 'Kept' : 'Keep this stop'}
                              </button>
                              {original.alternatives.length > 0 ? (
                                <button type="button" className="inline-flex min-h-11 items-center text-sm font-semibold text-ink-soft underline-offset-[0.2em] hover:underline" onClick={() => swap(day.dayNumber, stop, original)} disabled={locked}>
                                  Swap ({original.alternatives.length} {original.alternatives.length === 1 ? 'option' : 'options'})
                                </button>
                              ) : null}
                              <MapLink query={stop.mapQuery} label="Map" />
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </article>
                ))}
              </div>

              {hotelPicks.length > 0 ? (
                <section className="mt-10 border-t border-paper-edge pt-6">
                  <p className="eyebrow">Where to stay for this trip</p>
                  <p className="mt-1 text-[15px] text-ink-soft">Matched to your neighborhoods and budget. Rates open on Booking.com; a saved hotel is not a room.</p>
                  <ul className="mt-3 grid gap-3 sm:grid-cols-3">
                    {hotelPicks.map((h) => (
                      <li key={h.slug} className="rounded-card border border-paper-edge p-4">
                        <Link href={`/hotels/${h.slug}/`} className="font-sans text-[16px] font-bold underline-offset-[0.2em] hover:underline">
                          {h.title}
                        </Link>
                        <p className="mt-1 text-sm text-ink-soft">{h.summary}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>

            {/* Alternatives, checks, costs */}
            <aside className="order-2 space-y-6 lg:order-none">
              <div>
                <p className="eyebrow">Why this plan</p>
                <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
                  <li>Stops are real records ranked for a {OCCASIONS.find((o) => o.value === profile.occasion)?.label.toLowerCase()} group of {profile.headcount}.</li>
                  {input.neighborhoods.length ? <li>Days stay close to {neighborhoods.find((n) => n.slug === input.neighborhoods[0])?.name}.</li> : <li>Each day keeps to one or two neighborhoods to limit cross-city travel.</li>}
                  {hasChildren(profile) ? <li>Family-unfriendly places are filtered out because children are in the group.</li> : null}
                  {input.wantsNightlife ? <li>An evening stop is included.</li> : <li>Evenings end after dinner; ask for nightlife in Your style to change that.</li>}
                </ul>
              </div>

              <div>
                <p className="eyebrow">Known costs</p>
                {knownCosts.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-sm text-ink-soft">
                    {knownCosts.map((s) => (
                      <li key={s.title}>
                        <span className="font-semibold text-ink">{s.title}.</span> {s.costNote}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-ink-soft">No stop carries a verified price yet.</p>
                )}
                <p className="mt-2 text-2xs text-ink-soft">
                  {unpriced > 0 ? `${unpriced} ${unpriced === 1 ? 'stop is' : 'stops are'} unpriced, so this is not an all-in total.` : ''} Taxes, tips and transport are not included.
                </p>
              </div>

              <div>
                <p className="eyebrow">Checks outstanding</p>
                <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
                  {checks.map((c) => (
                    <li key={c} className="flex gap-2">
                      <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {mustDos.length > 0 || saved.length > 0 ? (
                <div>
                  <p className="eyebrow">Unscheduled must-dos</p>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {mustDos.map((m) => (
                      <li key={m} className="text-ink-soft">
                        {m} <span className="text-2xs">(typed; place it with Swap)</span>
                      </li>
                    ))}
                    {saved.map((s) => (
                      <li key={s.id}>
                        <Link href={s.href} className="font-semibold text-ink underline-offset-[0.2em] hover:underline">
                          {s.title}
                        </Link>
                        {s.meta ? <span className="text-ink-soft"> · {s.meta}</span> : null}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-2xs text-ink-soft">Saved places live in this browser until an account exists. They are not placed automatically; swap a stop to fit them in.</p>
                </div>
              ) : null}
            </aside>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function StepDot({ n, active }: { n: number; active: boolean }) {
  return (
    <span aria-hidden="true" className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-sm font-bold ${active ? 'border-ink bg-ink text-paper' : 'border-ink-soft text-ink-soft'}`}>
      {n}
    </span>
  );
}
