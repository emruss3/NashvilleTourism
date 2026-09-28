'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { useState } from 'react';
import type { MediaRow, SpaceRow, VenueRow } from './rows';

const BUCKET = 'venue-media';

/**
 * Photos. Every upload needs the rights box ticked and a credit; the row
 * cannot be inserted without them (the policy checks both), and only
 * rights-cleared photos ever render publicly.
 */
export default function MediaEditor({ supabase, venue, spaces, media, onChanged }: { supabase: SupabaseClient; venue: VenueRow; spaces: SpaceRow[]; media: MediaRow[]; onChanged: () => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState('');
  const [credit, setCredit] = useState('');
  const [spaceId, setSpaceId] = useState('');
  const [rights, setRights] = useState(false);
  const [state, setState] = useState<'idle' | 'uploading' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !rights || !credit.trim()) return;
    setState('uploading');
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = `${venue.id}/${crypto.randomUUID()}.${ext}`;
    const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
    if (up.error) {
      setMessage(up.error.message);
      setState('error');
      return;
    }
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const { error } = await supabase.from('event_media').insert({
      venue_id: venue.id,
      space_id: spaceId || null,
      url: pub.publicUrl,
      alt: alt.trim(),
      credit: credit.trim(),
      rights_cleared: true,
      storage_path: path,
      sort_order: media.length,
    });
    if (error) {
      await supabase.storage.from(BUCKET).remove([path]);
      setMessage(error.message);
      setState('error');
      return;
    }
    setFile(null);
    setAlt('');
    setRights(false);
    setState('idle');
    (e.target as HTMLFormElement).reset();
    await onChanged();
  }

  async function remove(m: MediaRow) {
    if (!window.confirm('Remove this photo?')) return;
    const { error } = await supabase.from('event_media').delete().eq('id', m.id);
    if (error) {
      setMessage(error.message);
      setState('error');
      return;
    }
    if (m.storage_path) await supabase.storage.from(BUCKET).remove([m.storage_path]);
    await onChanged();
  }

  async function move(m: MediaRow, dir: -1 | 1) {
    const ordered = media.slice().sort((a, b) => a.sort_order - b.sort_order);
    const i = ordered.findIndex((x) => x.id === m.id);
    const j = i + dir;
    if (j < 0 || j >= ordered.length) return;
    await Promise.all([supabase.from('event_media').update({ sort_order: j }).eq('id', ordered[i].id), supabase.from('event_media').update({ sort_order: i }).eq('id', ordered[j].id)]);
    await onChanged();
  }

  return (
    <div className="grid gap-6">
      {media.length ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {media
            .slice()
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((m, i) => (
              <li key={m.id} className="rounded-card border border-paper-edge bg-paper p-3">
                <div className="aspect-[4/3] overflow-hidden rounded bg-ink">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.url} alt={m.alt} className="h-full w-full object-cover" loading="lazy" />
                </div>
                <p className="mt-2 text-sm text-ink">{m.alt || <span className="text-ink-soft">No description</span>}</p>
                <p className="text-2xs text-ink-soft">Photo: {m.credit}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-sm">
                  <button type="button" onClick={() => move(m, -1)} disabled={i === 0} className="underline underline-offset-[0.2em] disabled:opacity-40">
                    Move up
                  </button>
                  <button type="button" onClick={() => move(m, 1)} disabled={i === media.length - 1} className="underline underline-offset-[0.2em] disabled:opacity-40">
                    Move down
                  </button>
                  <button type="button" onClick={() => remove(m)} className="text-ink-soft underline underline-offset-[0.2em] hover:text-ink">
                    Remove
                  </button>
                </div>
              </li>
            ))}
        </ul>
      ) : (
        <p className="text-[15px] text-ink-soft">No photos yet. Six to ten good ones, landscape, of the spaces set for an event.</p>
      )}

      <form onSubmit={upload} className="grid gap-4 rounded-card border-2 border-ink bg-paper p-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="m-file" className="field-label">
            Photo <span className="font-normal text-ink-soft">(JPEG, PNG or WebP, up to 10 MB)</span>
          </label>
          <input id="m-file" type="file" accept="image/jpeg,image/png,image/webp" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-sm text-ink file:mr-3 file:rounded file:border file:border-ink file:bg-paper file:px-3 file:py-2 file:text-sm file:font-semibold" />
        </div>
        <div>
          <label htmlFor="m-alt" className="field-label">
            What the photo shows
          </label>
          <input id="m-alt" required maxLength={300} value={alt} onChange={(e) => setAlt(e.target.value)} className="field-input" placeholder="The rooftop set for a seated dinner at dusk" />
        </div>
        <div>
          <label htmlFor="m-space" className="field-label">
            Space <span className="font-normal text-ink-soft">(optional)</span>
          </label>
          <select id="m-space" value={spaceId} onChange={(e) => setSpaceId(e.target.value)} className="field-input">
            <option value="">Whole venue</option>
            {spaces.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="m-credit" className="field-label">
            Photo credit <span className="font-normal text-ink-soft">(required)</span>
          </label>
          <input id="m-credit" required maxLength={200} value={credit} onChange={(e) => setCredit(e.target.value)} className="field-input" placeholder="Photographer or studio name" />
        </div>
        <label className="inline-flex min-h-11 items-start gap-2 text-[15px] text-ink sm:col-span-2">
          <input type="checkbox" required checked={rights} onChange={(e) => setRights(e.target.checked)} className="mt-1 h-4 w-4 accent-ink" />
          <span>We hold the rights to this photo and license Nashville.com to show it with our listing, credited as above. No stock images.</span>
        </label>
        {state === 'error' ? (
          <p role="alert" className="text-sm text-ink sm:col-span-2">
            Not uploaded: {message}
          </p>
        ) : null}
        <div className="sm:col-span-2">
          <button type="submit" className="btn-primary sm:w-auto" disabled={state === 'uploading' || !file || !rights || !credit.trim()}>
            {state === 'uploading' ? 'Uploading…' : 'Upload photo'}
          </button>
        </div>
      </form>
    </div>
  );
}
