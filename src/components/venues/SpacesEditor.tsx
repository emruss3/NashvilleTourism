'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { useState } from 'react';
import { explainDbError, spaceProblems } from '@/lib/events/publish-check';
import { formatPerPerson, perPersonRange, priceBandLabel, spacePriceBand } from '@/lib/events/types';
import { centsToDollars, dollarsToCents, slugify, spaceView, type SpaceRow, type VenueRow } from './rows';

const MODELS: Array<[SpaceRow['pricing_model'], string]> = [
  ['min_spend', 'Minimum spend'],
  ['room_fee', 'Room fee'],
  ['per_person', 'Per person'],
  ['buyout', 'Buyout'],
];

type Draft = {
  name: string;
  summary: string;
  seated_capacity: string;
  standing_capacity: string;
  min_guests: string;
  pricing_model: SpaceRow['pricing_model'];
  min_spend: string;
  room_fee: string;
  per_person: string;
  per_person_max: string;
  buyout_from: string;
  fb_minimum: string;
  pricing_note: string;
  av_included: boolean;
  av_note: string;
  outdoor: boolean;
  accessible: boolean;
  private_entrance: boolean;
  hours_note: string;
  blackout_note: string;
  sort_order: string;
};

function toDraft(s?: SpaceRow): Draft {
  return {
    name: s?.name ?? '',
    summary: s?.summary ?? '',
    seated_capacity: s ? String(s.seated_capacity) : '',
    standing_capacity: s ? String(s.standing_capacity) : '',
    min_guests: s?.min_guests ? String(s.min_guests) : '',
    pricing_model: s?.pricing_model ?? 'min_spend',
    min_spend: centsToDollars(s?.min_spend_cents),
    room_fee: centsToDollars(s?.room_fee_cents),
    per_person: centsToDollars(s?.per_person_cents),
    per_person_max: centsToDollars(s?.per_person_max_cents),
    buyout_from: centsToDollars(s?.buyout_from_cents),
    fb_minimum: centsToDollars(s?.fb_minimum_cents),
    pricing_note: s?.pricing_note ?? '',
    av_included: s?.av_included ?? false,
    av_note: s?.av_note ?? '',
    outdoor: s?.outdoor ?? false,
    accessible: s?.accessible ?? false,
    private_entrance: s?.private_entrance ?? false,
    hours_note: s?.hours_note ?? '',
    blackout_note: s?.blackout_note ?? '',
    sort_order: s ? String(s.sort_order) : '0',
  };
}

function toRow(d: Draft, venueId: string, existing?: SpaceRow) {
  const text = (v: string) => (v.trim() ? v.trim() : null);
  return {
    venue_id: venueId,
    slug: existing?.slug ?? slugify(d.name),
    name: d.name.trim(),
    summary: text(d.summary),
    seated_capacity: Number(d.seated_capacity) || 0,
    standing_capacity: Number(d.standing_capacity) || 0,
    min_guests: d.min_guests.trim() ? Number(d.min_guests) : null,
    pricing_model: d.pricing_model,
    min_spend_cents: dollarsToCents(d.min_spend),
    room_fee_cents: dollarsToCents(d.room_fee),
    per_person_cents: dollarsToCents(d.per_person),
    per_person_max_cents: dollarsToCents(d.per_person_max),
    buyout_from_cents: dollarsToCents(d.buyout_from),
    fb_minimum_cents: dollarsToCents(d.fb_minimum),
    pricing_note: text(d.pricing_note),
    av_included: d.av_included,
    av_note: text(d.av_note),
    outdoor: d.outdoor,
    accessible: d.accessible,
    private_entrance: d.private_entrance,
    hours_note: text(d.hours_note),
    blackout_note: text(d.blackout_note),
    sort_order: Number(d.sort_order) || 0,
  };
}

/** What the public sees for this draft: the band and per-person line, never the numbers typed. */
function PublicPreview({ d }: { d: Draft }) {
  const view = spaceView({ ...(toRow(d, 'x') as unknown as SpaceRow), id: 'x', published: false });
  const band = spacePriceBand(view);
  const pp = perPersonRange(view);
  return (
    <div className="rounded-card border border-dashed border-ink bg-paper-sunk px-4 py-3 text-sm text-ink">
      <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-ink-soft">Shown publicly</p>
      <p className="mt-1">
        {band ? (
          <>
            <strong className="font-semibold tracking-[0.08em]">{band.band}</strong> {priceBandLabel(band.band)} {band.basis}
          </>
        ) : (
          'No price band yet'
        )}
        {pp ? <span className="block">{formatPerPerson(pp)}</span> : null}
      </p>
      <p className="mt-1 text-ink-soft">Your exact numbers stay private. They set the band, rank you for the right briefs and estimate the referral fee.</p>
    </div>
  );
}

/** The bookable spaces. Exact minimums go in; the public sees a band. */
export default function SpacesEditor({ supabase, venue, spaces, onChanged }: { supabase: SupabaseClient; venue: VenueRow; spaces: SpaceRow[]; onChanged: () => Promise<void> }) {
  const [open, setOpen] = useState<string | 'new' | null>(spaces.length ? null : 'new');
  return (
    <div className="grid gap-4">
      <ul className="grid gap-3">
        {spaces.map((s) => (
          <li key={s.id} className="rounded-card border border-paper-edge bg-paper">
            <button type="button" onClick={() => setOpen(open === s.id ? null : s.id)} aria-expanded={open === s.id} className="flex min-h-12 w-full items-center justify-between gap-3 px-4 text-left">
              <span className="font-sans text-[16px] font-bold text-ink">
                {s.name}
                <span className="ml-2 text-sm font-normal text-ink-soft">
                  {s.seated_capacity || '—'} seated · {s.standing_capacity || '—'} standing · {spacePriceBand(spaceView(s))?.band ?? 'no band'}
                </span>
              </span>
              <span className={`rounded px-2 py-0.5 text-2xs font-semibold uppercase tracking-[0.14em] ${s.published ? 'bg-ink text-paper' : 'border border-paper-edge text-ink-soft'}`}>{s.published ? 'Published' : 'Draft'}</span>
            </button>
            {open === s.id ? <SpaceForm supabase={supabase} venue={venue} space={s} onDone={async () => { setOpen(null); await onChanged(); }} /> : null}
          </li>
        ))}
      </ul>
      {open === 'new' ? (
        <div className="rounded-card border-2 border-ink bg-paper">
          <p className="px-4 pt-4 font-sans text-[16px] font-bold text-ink">New space</p>
          <SpaceForm supabase={supabase} venue={venue} onDone={async () => { setOpen(null); await onChanged(); }} />
        </div>
      ) : (
        <button type="button" onClick={() => setOpen('new')} className="btn-secondary sm:w-auto">
          Add a space
        </button>
      )}
    </div>
  );
}

function SpaceForm({ supabase, venue, space, onDone }: { supabase: SupabaseClient; venue: VenueRow; space?: SpaceRow; onDone: () => Promise<void> }) {
  const [d, setD] = useState<Draft>(toDraft(space));
  const [state, setState] = useState<'idle' | 'saving' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const problems = spaceProblems(spaceView({ ...(toRow(d, venue.id) as unknown as SpaceRow), id: 'x', published: false }));
  const field = 'field-input';

  async function save(e: React.FormEvent, publish?: boolean) {
    e.preventDefault();
    setState('saving');
    const row = { ...toRow(d, venue.id, space), ...(publish === undefined ? {} : { published: publish }) };
    const q = space ? supabase.from('event_spaces').update(row).eq('id', space.id) : supabase.from('event_spaces').insert(row);
    const { error } = await q;
    if (error) {
      setMessage(explainDbError(error.message));
      setState('error');
      return;
    }
    setState('idle');
    await onDone();
  }
  async function remove() {
    if (!space || !window.confirm(`Delete ${space.name}? This cannot be undone.`)) return;
    const { error } = await supabase.from('event_spaces').delete().eq('id', space.id);
    if (error) {
      setMessage(error.message);
      setState('error');
      return;
    }
    await onDone();
  }

  return (
    <form onSubmit={(e) => save(e)} className="grid gap-4 border-t border-paper-edge p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="s-name" className="field-label">
            Space name
          </label>
          <input id="s-name" required maxLength={120} value={d.name} onChange={(e) => set('name', e.target.value)} className={field} placeholder="Rooftop, Private dining room, Full buyout" />
        </div>
        <div>
          <label htmlFor="s-order" className="field-label">
            Order on your page
          </label>
          <input id="s-order" type="number" min={0} value={d.sort_order} onChange={(e) => set('sort_order', e.target.value)} className={field} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="s-summary" className="field-label">
            Summary <span className="font-normal text-ink-soft">({d.summary.length}/400)</span>
          </label>
          <input id="s-summary" maxLength={400} value={d.summary} onChange={(e) => set('summary', e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="s-seated" className="field-label">
            Seated capacity
          </label>
          <input id="s-seated" type="number" min={0} inputMode="numeric" required value={d.seated_capacity} onChange={(e) => set('seated_capacity', e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="s-standing" className="field-label">
            Standing capacity
          </label>
          <input id="s-standing" type="number" min={0} inputMode="numeric" required value={d.standing_capacity} onChange={(e) => set('standing_capacity', e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="s-min" className="field-label">
            Minimum group <span className="font-normal text-ink-soft">(optional)</span>
          </label>
          <input id="s-min" type="number" min={1} inputMode="numeric" value={d.min_guests} onChange={(e) => set('min_guests', e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="s-model" className="field-label">
            How you price it
          </label>
          <select id="s-model" value={d.pricing_model} onChange={(e) => set('pricing_model', e.target.value as SpaceRow['pricing_model'])} className={field}>
            {MODELS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="grid gap-4 rounded-card border border-paper-edge bg-paper p-4 sm:grid-cols-3">
        <legend className="px-1 font-sans text-2xs font-bold uppercase tracking-[0.14em] text-ink">Exact numbers, in dollars (private)</legend>
        <div>
          <label htmlFor="s-minspend" className="field-label">
            Minimum spend
          </label>
          <input id="s-minspend" inputMode="decimal" value={d.min_spend} onChange={(e) => set('min_spend', e.target.value)} className={field} placeholder="5000" />
        </div>
        <div>
          <label htmlFor="s-roomfee" className="field-label">
            Room fee
          </label>
          <input id="s-roomfee" inputMode="decimal" value={d.room_fee} onChange={(e) => set('room_fee', e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="s-buyout" className="field-label">
            Buyout from
          </label>
          <input id="s-buyout" inputMode="decimal" value={d.buyout_from} onChange={(e) => set('buyout_from', e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="s-pp" className="field-label">
            Per person, from
          </label>
          <input id="s-pp" inputMode="decimal" value={d.per_person} onChange={(e) => set('per_person', e.target.value)} className={field} placeholder="45" />
        </div>
        <div>
          <label htmlFor="s-ppmax" className="field-label">
            Per person, up to <span className="font-normal text-ink-soft">(optional)</span>
          </label>
          <input id="s-ppmax" inputMode="decimal" value={d.per_person_max} onChange={(e) => set('per_person_max', e.target.value)} className={field} placeholder="80" />
        </div>
        <div>
          <label htmlFor="s-fb" className="field-label">
            F&amp;B minimum <span className="font-normal text-ink-soft">(optional)</span>
          </label>
          <input id="s-fb" inputMode="decimal" value={d.fb_minimum} onChange={(e) => set('fb_minimum', e.target.value)} className={field} />
        </div>
        <div className="sm:col-span-3">
          <PublicPreview d={d} />
        </div>
        <div className="sm:col-span-3">
          <label htmlFor="s-pnote" className="field-label">
            Pricing note <span className="font-normal text-ink-soft">(public, {d.pricing_note.length}/300; what is included, not the number)</span>
          </label>
          <input id="s-pnote" maxLength={300} value={d.pricing_note} onChange={(e) => set('pricing_note', e.target.value)} className={field} />
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset className="sm:col-span-2">
          <legend className="field-label">Features</legend>
          <div className="flex flex-wrap gap-4">
            {(
              [
                ['av_included', 'AV included'],
                ['outdoor', 'Outdoor'],
                ['accessible', 'Step-free access'],
                ['private_entrance', 'Private entrance'],
              ] as Array<[keyof Draft, string]>
            ).map(([k, l]) => (
              <label key={k} className="inline-flex min-h-11 items-center gap-2 text-[15px] text-ink">
                <input type="checkbox" checked={Boolean(d[k])} onChange={(e) => set(k, e.target.checked as never)} className="h-4 w-4 accent-ink" />
                {l}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="s-avnote" className="field-label">
            AV note
          </label>
          <input id="s-avnote" value={d.av_note} onChange={(e) => set('av_note', e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="s-hours" className="field-label">
            Hours note
          </label>
          <input id="s-hours" value={d.hours_note} onChange={(e) => set('hours_note', e.target.value)} className={field} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="s-blackout" className="field-label">
            Blackout dates
          </label>
          <input id="s-blackout" value={d.blackout_note} onChange={(e) => set('blackout_note', e.target.value)} className={field} placeholder="e.g. no buyouts CMA Fest week or New Year's Eve" />
        </div>
      </div>

      {problems.length ? (
        <ul className="grid gap-1 rounded-card border border-paper-edge bg-paper-sunk px-4 py-3 text-sm text-ink" aria-label="Before this space can be published">
          {problems.map((p) => (
            <li key={p}>• {p}</li>
          ))}
        </ul>
      ) : null}
      {state === 'error' ? (
        <p role="alert" className="text-sm text-ink">
          Not saved: {message}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary sm:w-auto" disabled={state === 'saving'}>
          {state === 'saving' ? 'Saving…' : space ? 'Save space' : 'Add space'}
        </button>
        {space ? (
          <button type="button" onClick={(e) => save(e, !space.published)} className="btn-secondary sm:w-auto" disabled={state === 'saving' || (!space.published && problems.length > 0)}>
            {space.published ? 'Unpublish' : 'Save and publish'}
          </button>
        ) : null}
        {space ? (
          <button type="button" onClick={remove} className="inline-flex min-h-11 items-center text-sm text-ink-soft underline underline-offset-[0.2em] hover:text-ink">
            Delete
          </button>
        ) : null}
      </div>
    </form>
  );
}
