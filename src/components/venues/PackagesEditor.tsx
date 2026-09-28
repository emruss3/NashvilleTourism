'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { useState } from 'react';
import { explainDbError, packageProblems } from '@/lib/events/publish-check';
import { formatUsd } from '@/lib/events/types';
import { EVENT_OCCASIONS } from '@/lib/private-events';
import { centsToDollars, dollarsToCents, slugify, type PackageRow, type SpaceRow, type VenueRow } from './rows';

type Draft = {
  name: string;
  space_id: string;
  summary: string;
  for_occasions: string[];
  min_guests: string;
  max_guests: string;
  price: string;
  price_basis: 'total' | 'per_person';
  includes: string;
  deposit_note: string;
  book_url: string;
  sort_order: string;
};

function toDraft(p?: PackageRow): Draft {
  return {
    name: p?.name ?? '',
    space_id: p?.space_id ?? '',
    summary: p?.summary ?? '',
    for_occasions: p?.for_occasions ?? [],
    min_guests: p?.min_guests ? String(p.min_guests) : '',
    max_guests: p?.max_guests ? String(p.max_guests) : '',
    price: centsToDollars(p?.price_cents),
    price_basis: p?.price_basis ?? 'total',
    includes: (p?.includes ?? []).join('\n'),
    deposit_note: p?.deposit_note ?? '',
    book_url: p?.book_url ?? '',
    sort_order: p ? String(p.sort_order) : '0',
  };
}
function toRow(d: Draft, venueId: string, existing?: PackageRow) {
  const text = (v: string) => (v.trim() ? v.trim() : null);
  return {
    venue_id: venueId,
    space_id: d.space_id || null,
    slug: existing?.slug ?? slugify(d.name),
    name: d.name.trim(),
    summary: text(d.summary),
    for_occasions: d.for_occasions,
    min_guests: d.min_guests.trim() ? Number(d.min_guests) : null,
    max_guests: d.max_guests.trim() ? Number(d.max_guests) : null,
    price_cents: dollarsToCents(d.price) ?? 0,
    price_basis: d.price_basis,
    includes: d.includes.split('\n').map((l) => l.trim()).filter(Boolean),
    deposit_note: text(d.deposit_note),
    book_url: text(d.book_url),
    sort_order: Number(d.sort_order) || 0,
  };
}

/** Instant answers: a fixed offer with a price and a link into the venue's own booking. The one place "From $X" shows. */
export default function PackagesEditor({ supabase, venue, spaces, packages, onChanged }: { supabase: SupabaseClient; venue: VenueRow; spaces: SpaceRow[]; packages: PackageRow[]; onChanged: () => Promise<void> }) {
  const [open, setOpen] = useState<string | 'new' | null>(null);
  return (
    <div className="grid gap-4">
      <p className="max-w-prose text-[15px] text-ink-soft">
        A package answers on the spot: &ldquo;Reserved patio for 20, $1,200, book now.&rdquo; The button goes to your own booking page; any deposit is taken there, never here. Nashville.com&rsquo;s referral fee applies to booked packages like any other event.
      </p>
      <ul className="grid gap-3">
        {packages.map((p) => (
          <li key={p.id} className="rounded-card border border-paper-edge bg-paper">
            <button type="button" onClick={() => setOpen(open === p.id ? null : p.id)} aria-expanded={open === p.id} className="flex min-h-12 w-full items-center justify-between gap-3 px-4 text-left">
              <span className="font-sans text-[16px] font-bold text-ink">
                {p.name}
                <span className="ml-2 text-sm font-normal text-ink-soft">
                  {formatUsd(p.price_cents / 100)}
                  {p.price_basis === 'per_person' ? ' a person' : ''} · up to {p.max_guests ?? '—'} guests
                </span>
              </span>
              <span className={`rounded px-2 py-0.5 text-2xs font-semibold uppercase tracking-[0.14em] ${p.published ? 'bg-ink text-paper' : 'border border-paper-edge text-ink-soft'}`}>{p.published ? 'Published' : 'Draft'}</span>
            </button>
            {open === p.id ? <PackageForm supabase={supabase} venue={venue} spaces={spaces} pkg={p} onDone={async () => { setOpen(null); await onChanged(); }} /> : null}
          </li>
        ))}
      </ul>
      {open === 'new' ? (
        <div className="rounded-card border-2 border-ink bg-paper">
          <p className="px-4 pt-4 font-sans text-[16px] font-bold text-ink">New package</p>
          <PackageForm supabase={supabase} venue={venue} spaces={spaces} onDone={async () => { setOpen(null); await onChanged(); }} />
        </div>
      ) : (
        <button type="button" onClick={() => setOpen('new')} className="btn-secondary sm:w-auto">
          Add a package
        </button>
      )}
    </div>
  );
}

function PackageForm({ supabase, venue, spaces, pkg, onDone }: { supabase: SupabaseClient; venue: VenueRow; spaces: SpaceRow[]; pkg?: PackageRow; onDone: () => Promise<void> }) {
  const [d, setD] = useState<Draft>(toDraft(pkg));
  const [state, setState] = useState<'idle' | 'saving' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const row = toRow(d, venue.id, pkg);
  const problems = packageProblems({ name: row.name, summary: row.summary, includes: row.includes, depositNote: row.deposit_note, bookUrl: row.book_url, maxGuests: row.max_guests, priceCents: row.price_cents });
  const field = 'field-input';

  async function save(e: React.FormEvent, publish?: boolean) {
    e.preventDefault();
    setState('saving');
    const payload = { ...toRow(d, venue.id, pkg), ...(publish === undefined ? {} : { published: publish }) };
    const q = pkg ? supabase.from('event_packages').update(payload).eq('id', pkg.id) : supabase.from('event_packages').insert(payload);
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
    if (!pkg || !window.confirm(`Delete ${pkg.name}?`)) return;
    const { error } = await supabase.from('event_packages').delete().eq('id', pkg.id);
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
          <label htmlFor="p-name" className="field-label">
            Package name
          </label>
          <input id="p-name" required maxLength={120} value={d.name} onChange={(e) => set('name', e.target.value)} className={field} placeholder="Reserved patio for 20" />
        </div>
        <div>
          <label htmlFor="p-space" className="field-label">
            Space <span className="font-normal text-ink-soft">(optional)</span>
          </label>
          <select id="p-space" value={d.space_id} onChange={(e) => set('space_id', e.target.value)} className={field}>
            <option value="">Whole venue / not tied to a space</option>
            {spaces.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="p-summary" className="field-label">
            Summary <span className="font-normal text-ink-soft">({d.summary.length}/400)</span>
          </label>
          <input id="p-summary" maxLength={400} value={d.summary} onChange={(e) => set('summary', e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="p-price" className="field-label">
            Price, in dollars <span className="font-normal text-ink-soft">(shown as &ldquo;From $X&rdquo;)</span>
          </label>
          <input id="p-price" inputMode="decimal" required value={d.price} onChange={(e) => set('price', e.target.value)} className={field} placeholder="1200" />
        </div>
        <div>
          <label htmlFor="p-basis" className="field-label">
            Price is
          </label>
          <select id="p-basis" value={d.price_basis} onChange={(e) => set('price_basis', e.target.value as Draft['price_basis'])} className={field}>
            <option value="total">the total for the package</option>
            <option value="per_person">per person</option>
          </select>
        </div>
        <div>
          <label htmlFor="p-min" className="field-label">
            Minimum guests <span className="font-normal text-ink-soft">(optional)</span>
          </label>
          <input id="p-min" type="number" min={1} value={d.min_guests} onChange={(e) => set('min_guests', e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="p-max" className="field-label">
            Maximum guests
          </label>
          <input id="p-max" type="number" min={1} required value={d.max_guests} onChange={(e) => set('max_guests', e.target.value)} className={field} />
        </div>
        <fieldset className="sm:col-span-2">
          <legend className="field-label">Good for</legend>
          <ul className="flex flex-wrap gap-2">
            {EVENT_OCCASIONS.map((o) => {
              const on = d.for_occasions.includes(o.value);
              return (
                <li key={o.value}>
                  <label className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded border px-3 text-sm ${on ? 'border-ink bg-paper-sunk font-semibold text-ink' : 'border-paper-edge bg-paper text-ink'}`}>
                    <input type="checkbox" className="sr-only" checked={on} onChange={() => set('for_occasions', on ? d.for_occasions.filter((x) => x !== o.value) : [...d.for_occasions, o.value])} />
                    {o.title}
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
        <div className="sm:col-span-2">
          <label htmlFor="p-includes" className="field-label">
            What is included <span className="font-normal text-ink-soft">(one line each)</span>
          </label>
          <textarea id="p-includes" rows={4} value={d.includes} onChange={(e) => set('includes', e.target.value)} className={`${field} min-h-[6rem] resize-y`} placeholder={'Reserved patio, 3 hours\nWelcome cocktail\nShared plates for the table'} />
        </div>
        <div>
          <label htmlFor="p-deposit" className="field-label">
            Deposit note <span className="font-normal text-ink-soft">(taken by you, on your page)</span>
          </label>
          <input id="p-deposit" maxLength={300} value={d.deposit_note} onChange={(e) => set('deposit_note', e.target.value)} className={field} placeholder="50% deposit at booking, refundable to 14 days out" />
        </div>
        <div>
          <label htmlFor="p-url" className="field-label">
            Your booking link
          </label>
          <input id="p-url" type="url" required value={d.book_url} onChange={(e) => set('book_url', e.target.value)} className={field} placeholder="https://" />
        </div>
        <div>
          <label htmlFor="p-order" className="field-label">
            Order on your page
          </label>
          <input id="p-order" type="number" min={0} value={d.sort_order} onChange={(e) => set('sort_order', e.target.value)} className={field} />
        </div>
      </div>
      {problems.length ? (
        <ul className="grid gap-1 rounded-card border border-paper-edge bg-paper-sunk px-4 py-3 text-sm text-ink" aria-label="Before this package can be published">
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
          {state === 'saving' ? 'Saving…' : pkg ? 'Save package' : 'Add package'}
        </button>
        {pkg ? (
          <button type="button" onClick={(e) => save(e, !pkg.published)} className="btn-secondary sm:w-auto" disabled={state === 'saving' || (!pkg.published && problems.length > 0)}>
            {pkg.published ? 'Unpublish' : 'Save and publish'}
          </button>
        ) : null}
        {pkg ? (
          <button type="button" onClick={remove} className="inline-flex min-h-11 items-center text-sm text-ink-soft underline underline-offset-[0.2em] hover:text-ink">
            Delete
          </button>
        ) : null}
      </div>
    </form>
  );
}
