'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { useState } from 'react';
import { neighborhoods } from '@/lib/content/neighborhoods';
import { VENUE_FEATURES, VENUE_KIND_LABEL } from '@/lib/private-events';
import type { VenueRow } from './rows';

const KINDS = Object.entries(VENUE_KIND_LABEL) as Array<[VenueRow['kind'], string]>;
const LEAD_SYSTEMS = [
  { value: 'email', label: 'Email (the lead is emailed to your sales contact)' },
  { value: 'tripleseat', label: 'Tripleseat (lead form URL below, plus the email)' },
  { value: 'perfect_venue', label: 'Perfect Venue (lead URL below, plus the email)' },
  { value: 'other', label: 'Another system (webhook URL below, plus the email)' },
];

/** The venue's own fields. Commercial terms and ownership are shown, not edited. */
export default function VenueForm({ supabase, venue, onSaved }: { supabase: SupabaseClient; venue: VenueRow; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({
    name: venue.name,
    kind: venue.kind,
    neighborhood_slug: venue.neighborhood_slug,
    address: venue.address,
    lat: venue.lat === null ? '' : String(venue.lat),
    lng: venue.lng === null ? '' : String(venue.lng),
    summary: venue.summary ?? '',
    description: venue.description ?? '',
    website: venue.website ?? '',
    tour_url: venue.tour_url ?? '',
    hours_note: venue.hours_note ?? '',
    features: venue.features ?? [],
    sales_contact_name: venue.sales_contact_name ?? '',
    sales_contact_email: venue.sales_contact_email ?? '',
    sales_contact_phone: venue.sales_contact_phone ?? '',
    lead_system: venue.lead_system,
    lead_system_endpoint: venue.lead_system_endpoint ?? '',
  });
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const set = (key: keyof typeof form, value: string | string[]) => setForm((f) => ({ ...f, [key]: value }));
  const text = (v: string) => (v.trim() ? v.trim() : null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setState('saving');
    const { error } = await supabase
      .from('event_venues')
      .update({
        name: form.name.trim(),
        kind: form.kind,
        neighborhood_slug: form.neighborhood_slug,
        address: form.address.trim(),
        lat: form.lat.trim() ? Number(form.lat) : null,
        lng: form.lng.trim() ? Number(form.lng) : null,
        summary: form.summary.trim(),
        description: text(form.description),
        website: text(form.website),
        tour_url: text(form.tour_url),
        hours_note: text(form.hours_note),
        features: form.features,
        sales_contact_name: text(form.sales_contact_name),
        sales_contact_email: text(form.sales_contact_email),
        sales_contact_phone: text(form.sales_contact_phone),
        lead_system: form.lead_system,
        lead_system_endpoint: text(form.lead_system_endpoint),
      })
      .eq('id', venue.id);
    if (error) {
      setMessage(error.message);
      setState('error');
      return;
    }
    setState('saved');
    await onSaved();
  }

  const field = 'field-input';
  return (
    <form onSubmit={save} className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="v-name" className="field-label">
            Venue name
          </label>
          <input id="v-name" required maxLength={120} value={form.name} onChange={(e) => set('name', e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="v-kind" className="field-label">
            Kind
          </label>
          <select id="v-kind" value={form.kind} onChange={(e) => set('kind', e.target.value)} className={field}>
            {KINDS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="v-hood" className="field-label">
            Neighborhood
          </label>
          <select id="v-hood" value={form.neighborhood_slug} onChange={(e) => set('neighborhood_slug', e.target.value)} className={field}>
            {neighborhoods.map((n) => (
              <option key={n.slug} value={n.slug}>
                {n.name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="v-address" className="field-label">
            Street address
          </label>
          <input id="v-address" required maxLength={200} value={form.address} onChange={(e) => set('address', e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="v-lat" className="field-label">
            Latitude <span className="font-normal text-ink-soft">(optional)</span>
          </label>
          <input id="v-lat" inputMode="decimal" value={form.lat} onChange={(e) => set('lat', e.target.value)} className={field} placeholder="36.1265" />
        </div>
        <div>
          <label htmlFor="v-lng" className="field-label">
            Longitude <span className="font-normal text-ink-soft">(optional)</span>
          </label>
          <input id="v-lng" inputMode="decimal" value={form.lng} onChange={(e) => set('lng', e.target.value)} className={field} placeholder="-86.7893" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="v-summary" className="field-label">
            One-line summary <span className="font-normal text-ink-soft">({form.summary.length}/300; shown on cards)</span>
          </label>
          <input id="v-summary" required maxLength={300} value={form.summary} onChange={(e) => set('summary', e.target.value)} className={field} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="v-description" className="field-label">
            Description <span className="font-normal text-ink-soft">(written by you, shown on your page)</span>
          </label>
          <textarea id="v-description" rows={5} value={form.description} onChange={(e) => set('description', e.target.value)} className={`${field} min-h-[8rem] resize-y`} />
        </div>
        <div>
          <label htmlFor="v-website" className="field-label">
            Website
          </label>
          <input id="v-website" type="url" value={form.website} onChange={(e) => set('website', e.target.value)} className={field} placeholder="https://" />
        </div>
        <div>
          <label htmlFor="v-tour" className="field-label">
            Virtual tour link <span className="font-normal text-ink-soft">(optional)</span>
          </label>
          <input id="v-tour" type="url" value={form.tour_url} onChange={(e) => set('tour_url', e.target.value)} className={field} placeholder="https://" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="v-hours" className="field-label">
            Hours for private events <span className="font-normal text-ink-soft">({form.hours_note.length}/300)</span>
          </label>
          <input id="v-hours" maxLength={300} value={form.hours_note} onChange={(e) => set('hours_note', e.target.value)} className={field} placeholder="e.g. Daytime buyouts Mon to Thu; evenings from 6 pm any day" />
        </div>
        <fieldset className="sm:col-span-2">
          <legend className="field-label">Features</legend>
          <ul className="flex flex-wrap gap-2">
            {VENUE_FEATURES.map((f) => {
              const on = form.features.includes(f.value);
              return (
                <li key={f.value}>
                  <label className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded border px-3 text-sm ${on ? 'border-ink bg-paper-sunk font-semibold text-ink' : 'border-paper-edge bg-paper text-ink'}`}>
                    <input type="checkbox" className="sr-only" checked={on} onChange={() => set('features', on ? form.features.filter((x) => x !== f.value) : [...form.features, f.value])} />
                    {f.label}
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      </div>

      <fieldset className="grid gap-4 rounded-card border border-paper-edge bg-paper p-4 sm:grid-cols-2">
        <legend className="px-1 font-sans text-2xs font-bold uppercase tracking-[0.14em] text-ink">Where leads go</legend>
        <div>
          <label htmlFor="v-sc-name" className="field-label">
            Sales contact name
          </label>
          <input id="v-sc-name" value={form.sales_contact_name} onChange={(e) => set('sales_contact_name', e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="v-sc-email" className="field-label">
            Sales contact email <span className="font-normal text-ink-soft">(required to publish)</span>
          </label>
          <input id="v-sc-email" type="email" value={form.sales_contact_email} onChange={(e) => set('sales_contact_email', e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="v-sc-phone" className="field-label">
            Sales contact phone <span className="font-normal text-ink-soft">(optional)</span>
          </label>
          <input id="v-sc-phone" type="tel" value={form.sales_contact_phone} onChange={(e) => set('sales_contact_phone', e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="v-lead" className="field-label">
            Lead system
          </label>
          <select id="v-lead" value={form.lead_system} onChange={(e) => set('lead_system', e.target.value)} className={field}>
            {LEAD_SYSTEMS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
        {form.lead_system !== 'email' ? (
          <div className="sm:col-span-2">
            <label htmlFor="v-lead-url" className="field-label">
              Lead form or webhook URL
            </label>
            <input id="v-lead-url" type="url" value={form.lead_system_endpoint} onChange={(e) => set('lead_system_endpoint', e.target.value)} className={field} placeholder="https://" />
          </div>
        ) : null}
      </fieldset>

      <dl className="grid gap-x-6 gap-y-1 text-sm text-ink-soft sm:grid-cols-3">
        <div>
          <dt className="font-semibold text-ink">Referral fee</dt>
          <dd>{Number(venue.fee_pct)}% of contracted spend when an event books, $250 minimum. Set by your agreement.</dd>
        </div>
        <div>
          <dt className="font-semibold text-ink">Reply promise</dt>
          <dd>{venue.sla_hours} business hours from routing.</dd>
        </div>
        <div>
          <dt className="font-semibold text-ink">Public address</dt>
          <dd>/private-events/venues/{venue.slug}/</dd>
        </div>
      </dl>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary sm:w-auto" disabled={state === 'saving'}>
          {state === 'saving' ? 'Saving…' : 'Save venue'}
        </button>
        {state === 'saved' ? <span role="status" className="text-sm text-ink-soft">Saved.</span> : null}
        {state === 'error' ? (
          <span role="alert" className="text-sm text-ink">
            Not saved: {message}
          </span>
        ) : null}
      </div>
    </form>
  );
}
