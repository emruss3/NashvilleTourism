'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { useState } from 'react';
import type { MediaRow, SpaceRow, VenueRow } from './rows';

const BUCKET = 'venue-media';

type Kind = MediaRow['kind'];
const KINDS: Array<[Kind, string, string]> = [
  ['photo', 'Photo', 'JPEG, PNG or WebP, up to 10 MB'],
  ['floor_plan', 'Floor plan', 'PNG, JPEG or PDF; one per floor, labelled'],
  ['menu_pdf', 'Menu (PDF)', 'Your event menu as a PDF'],
  ['video', 'Video link', 'A Vimeo or YouTube link; nothing is uploaded'],
];
const ACCEPT: Record<Kind, string> = {
  photo: 'image/jpeg,image/png,image/webp',
  floor_plan: 'image/jpeg,image/png,image/webp,application/pdf',
  menu_pdf: 'application/pdf',
  video: '',
  tour_poster: 'image/jpeg,image/png,image/webp',
};
const KIND_LABEL: Record<Kind, string> = { photo: 'Photo', floor_plan: 'Floor plan', menu_pdf: 'Menu', video: 'Video', tour_poster: 'Tour poster' };

function videoUrlOk(url: string): boolean {
  try {
    const u = new URL(url);
    return /(^|\.)(vimeo\.com|youtube\.com|youtu\.be)$/i.test(u.hostname);
  } catch {
    return false;
  }
}

/**
 * Photos, floor plans, menus and video links. Every upload needs the rights
 * box ticked and a credit; the row cannot be inserted without them (the
 * policy checks both), and only rights-cleared media ever renders publicly.
 * Floor plans carry a floor label and show on the venue page's Floor plans
 * tab.
 */
export default function MediaEditor({ supabase, venue, spaces, media, onChanged }: { supabase: SupabaseClient; venue: VenueRow; spaces: SpaceRow[]; media: MediaRow[]; onChanged: () => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<Kind>('photo');
  const [floorLabel, setFloorLabel] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [alt, setAlt] = useState('');
  const [credit, setCredit] = useState('');
  const [spaceId, setSpaceId] = useState('');
  const [rights, setRights] = useState(false);
  const [state, setState] = useState<'idle' | 'uploading' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const isVideo = kind === 'video';
  const ready = rights && credit.trim() && (isVideo ? videoUrlOk(videoUrl.trim()) : Boolean(file)) && (kind !== 'floor_plan' || floorLabel.trim());

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setState('uploading');
    let url = videoUrl.trim();
    let path: string | null = null;
    if (!isVideo && file) {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      path = `${venue.id}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
      if (up.error) {
        setMessage(up.error.message);
        setState('error');
        return;
      }
      url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    }
    const { error } = await supabase.from('event_media').insert({
      venue_id: venue.id,
      space_id: spaceId || null,
      url,
      alt: alt.trim(),
      credit: credit.trim(),
      rights_cleared: true,
      storage_path: path,
      sort_order: media.length,
      kind,
      floor_label: kind === 'floor_plan' ? floorLabel.trim() : null,
    });
    if (error) {
      if (path) await supabase.storage.from(BUCKET).remove([path]);
      setMessage(error.message);
      setState('error');
      return;
    }
    setFile(null);
    setAlt('');
    setFloorLabel('');
    setVideoUrl('');
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
                  {m.kind === 'video' || /\.pdf($|\?)/i.test(m.url) ? (
                    <a href={m.url} target="_blank" rel="noopener noreferrer" className="flex h-full w-full items-center justify-center text-sm font-semibold text-paper">
                      Open {KIND_LABEL[m.kind].toLowerCase()}
                    </a>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.url} alt={m.alt} className={`h-full w-full ${m.kind === 'floor_plan' ? 'bg-white object-contain' : 'object-cover'}`} loading="lazy" />
                  )}
                </div>
                <p className="mt-2 text-2xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
                  {KIND_LABEL[m.kind]}
                  {m.floor_label ? ` · ${m.floor_label}` : ''}
                </p>
                <p className="mt-1 text-sm text-ink">{m.alt || <span className="text-ink-soft">No description</span>}</p>
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
        <p className="text-[15px] text-ink-soft">Nothing yet. Six to ten good photos, landscape, of the spaces set for an event; a floor plan per floor; your event menu.</p>
      )}

      <form onSubmit={upload} className="grid gap-4 rounded-card border-2 border-ink bg-paper p-4 sm:grid-cols-2">
        <fieldset className="sm:col-span-2">
          <legend className="field-label">What are you adding?</legend>
          <div className="flex flex-wrap gap-2">
            {KINDS.map(([value, label]) => (
              <label key={value} className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded border px-3 text-sm ${kind === value ? 'border-ink bg-paper-sunk font-semibold text-ink' : 'border-paper-edge bg-paper text-ink'}`}>
                <input type="radio" name="kind" value={value} className="sr-only" checked={kind === value} onChange={() => setKind(value)} />
                {label}
              </label>
            ))}
          </div>
          <p className="mt-1 text-2xs text-ink-soft">{KINDS.find(([v]) => v === kind)?.[2]}</p>
        </fieldset>
        {isVideo ? (
          <div className="sm:col-span-2">
            <label htmlFor="m-video" className="field-label">
              Video link
            </label>
            <input id="m-video" type="url" required value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className="field-input" placeholder="https://vimeo.com/…" />
            {videoUrl.trim() && !videoUrlOk(videoUrl.trim()) ? <p className="mt-1 text-2xs text-ink">Vimeo and YouTube links only.</p> : null}
          </div>
        ) : (
          <div className="sm:col-span-2">
            <label htmlFor="m-file" className="field-label">
              File <span className="font-normal text-ink-soft">(up to 10 MB)</span>
            </label>
            <input id="m-file" type="file" accept={ACCEPT[kind]} required onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-sm text-ink file:mr-3 file:rounded file:border file:border-ink file:bg-paper file:px-3 file:py-2 file:text-sm file:font-semibold" />
          </div>
        )}
        {kind === 'floor_plan' ? (
          <div>
            <label htmlFor="m-floor" className="field-label">
              Floor label <span className="font-normal text-ink-soft">(required)</span>
            </label>
            <input id="m-floor" required maxLength={60} value={floorLabel} onChange={(e) => setFloorLabel(e.target.value)} className="field-input" placeholder="Floor 3, Rooftop, Mezzanine" />
          </div>
        ) : null}
        <div>
          <label htmlFor="m-alt" className="field-label">
            {isVideo ? 'What the video shows' : kind === 'photo' ? 'What the photo shows' : 'Short description'}
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
            Credit <span className="font-normal text-ink-soft">(required)</span>
          </label>
          <input id="m-credit" required maxLength={200} value={credit} onChange={(e) => setCredit(e.target.value)} className="field-input" placeholder="Photographer or studio name" />
        </div>
        <label className="inline-flex min-h-11 items-start gap-2 text-[15px] text-ink sm:col-span-2">
          <input type="checkbox" required checked={rights} onChange={(e) => setRights(e.target.checked)} className="mt-1 h-4 w-4 accent-ink" />
          <span>We hold the rights to this {isVideo ? 'video' : kind === 'photo' ? 'photo' : 'file'} and license Nashville.com to show it with our listing, credited as above. No stock images.</span>
        </label>
        {state === 'error' ? (
          <p role="alert" className="text-sm text-ink sm:col-span-2">
            Not uploaded: {message}
          </p>
        ) : null}
        <div className="sm:col-span-2">
          <button type="submit" className="btn-primary sm:w-auto" disabled={state === 'uploading' || !ready}>
            {state === 'uploading' ? 'Uploading…' : isVideo ? 'Add video link' : `Upload ${KIND_LABEL[kind].toLowerCase()}`}
          </button>
        </div>
      </form>
    </div>
  );
}
