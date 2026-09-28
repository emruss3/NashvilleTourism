'use client';

import type { Session, SupabaseClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { site } from '@/lib/site';
import MediaEditor from './MediaEditor';
import PackagesEditor from './PackagesEditor';
import PublishPanel from './PublishPanel';
import SpacesEditor from './SpacesEditor';
import VenueForm from './VenueForm';
import type { MediaRow, PackageRow, SpaceRow, VenueRow } from './rows';

type Tab = 'venue' | 'spaces' | 'packages' | 'photos' | 'publish';
const TABS: { key: Tab; label: string }[] = [
  { key: 'venue', label: 'Venue' },
  { key: 'spaces', label: 'Spaces' },
  { key: 'packages', label: 'Packages' },
  { key: 'photos', label: 'Photos' },
  { key: 'publish', label: 'Publish' },
];

export interface VenueData {
  venue: VenueRow;
  spaces: SpaceRow[];
  packages: PackageRow[];
  media: MediaRow[];
}

/**
 * The venue dashboard. Signs the venue's people in with a Supabase magic
 * link and edits their listing directly against the tables; row level
 * security limits every read and write to venues their email is attached
 * to (event_venue_users), so no server code sits between them and their
 * rows. The listing editor ships first; the leads inbox follows.
 */
export default function Dashboard() {
  const [supabase] = useState<SupabaseClient>(() => supabaseBrowser());
  const [session, setSession] = useState<Session | null | 'loading'>('loading');
  const [venues, setVenues] = useState<VenueRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [data, setData] = useState<VenueData | null>(null);
  const [tab, setTab] = useState<Tab>('venue');
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: d }) => setSession(d.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!session || session === 'loading') return;
    supabase
      .from('event_venues')
      .select('*')
      .order('name')
      .then(({ data: rows, error }) => {
        if (error) {
          setNotice(`Could not load your venues: ${error.message}`);
          return;
        }
        const list = (rows ?? []) as VenueRow[];
        setVenues(list);
        setActiveId((current) => current ?? list[0]?.id ?? null);
      });
  }, [session, supabase]);

  const reload = useCallback(async () => {
    if (!activeId) return;
    const [v, s, p, m] = await Promise.all([
      supabase.from('event_venues').select('*').eq('id', activeId).single(),
      supabase.from('event_spaces').select('*').eq('venue_id', activeId).order('sort_order'),
      supabase.from('event_packages').select('*').eq('venue_id', activeId).order('sort_order'),
      supabase.from('event_media').select('*').eq('venue_id', activeId).order('sort_order'),
    ]);
    if (v.error || !v.data) {
      setNotice(`Could not load the venue: ${v.error?.message ?? 'not found'}`);
      return;
    }
    setData({ venue: v.data as VenueRow, spaces: (s.data ?? []) as SpaceRow[], packages: (p.data ?? []) as PackageRow[], media: (m.data ?? []) as MediaRow[] });
  }, [activeId, supabase]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (session === 'loading') return <p className="text-[15px] text-ink-soft">Loading…</p>;
  if (!session) return <SignIn supabase={supabase} />;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {venues.length > 1 ? (
            <label className="text-sm text-ink">
              <span className="sr-only">Venue</span>
              <select value={activeId ?? ''} onChange={(e) => setActiveId(e.target.value)} className="field-input min-h-10 w-auto py-1.5">
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>
          ) : venues[0] ? (
            <p className="font-sans text-[17px] font-bold text-ink">{venues[0].name}</p>
          ) : null}
          {data ? (
            <span className={`rounded px-2 py-0.5 text-2xs font-semibold uppercase tracking-[0.14em] ${data.venue.published ? 'bg-ink text-paper' : 'border border-paper-edge text-ink-soft'}`}>{data.venue.published ? 'Published' : data.venue.approved_at ? 'Approved, not published' : data.venue.publish_requested_at ? 'Awaiting desk approval' : 'Draft'}</span>
          ) : null}
        </div>
        <p className="text-sm text-ink-soft">
          {session.user.email}
          {' · '}
          <button type="button" onClick={() => supabase.auth.signOut()} className="underline underline-offset-[0.2em]">
            Sign out
          </button>
        </p>
      </div>

      {notice ? (
        <p role="alert" className="rounded-card border border-ink bg-paper-sunk px-4 py-3 text-sm text-ink">
          {notice}
        </p>
      ) : null}

      {!venues.length ? (
        <div className="rounded-card border border-paper-edge bg-paper p-6">
          <p className="font-sans text-[17px] font-bold text-ink">Your email is not attached to a venue yet.</p>
          <p className="mt-2 max-w-prose text-[15px] text-ink-soft">
            The events desk adds each venue&rsquo;s people by email. Write to{' '}
            <a href={`mailto:${site.org.eventsEmail}`} className="font-semibold text-ink underline">
              {site.org.eventsEmail}
            </a>{' '}
            from this address ({session.user.email}) and say which venue you manage.
          </p>
        </div>
      ) : data ? (
        <>
          <nav aria-label="Listing sections" className="flex flex-wrap gap-1 border-b border-paper-edge">
            {TABS.map((t) => (
              <button key={t.key} type="button" onClick={() => setTab(t.key)} aria-current={tab === t.key ? 'page' : undefined} className={`-mb-px min-h-11 border-b-2 px-3 text-[15px] font-semibold ${tab === t.key ? 'border-ink text-ink' : 'border-transparent text-ink-soft hover:text-ink'}`}>
                {t.label}
                {t.key === 'spaces' ? ` (${data.spaces.length})` : t.key === 'packages' ? ` (${data.packages.length})` : t.key === 'photos' ? ` (${data.media.length})` : ''}
              </button>
            ))}
          </nav>
          {tab === 'venue' ? <VenueForm supabase={supabase} venue={data.venue} onSaved={reload} /> : null}
          {tab === 'spaces' ? <SpacesEditor supabase={supabase} venue={data.venue} spaces={data.spaces} onChanged={reload} /> : null}
          {tab === 'packages' ? <PackagesEditor supabase={supabase} venue={data.venue} spaces={data.spaces} packages={data.packages} onChanged={reload} /> : null}
          {tab === 'photos' ? <MediaEditor supabase={supabase} venue={data.venue} spaces={data.spaces} media={data.media} onChanged={reload} /> : null}
          {tab === 'publish' ? <PublishPanel supabase={supabase} data={data} onChanged={reload} /> : null}
          <p className="text-sm text-ink-soft">
            Public page:{' '}
            <Link href={`/private-events/venues/${data.venue.slug}/`} className="font-semibold text-ink underline underline-offset-[0.2em]">
              /private-events/venues/{data.venue.slug}/
            </Link>
            {data.venue.published ? '' : ' (returns not found until published)'}
          </p>
        </>
      ) : (
        <p className="text-[15px] text-ink-soft">Loading your listing…</p>
      )}
    </div>
  );
}

function SignIn({ supabase }: { supabase: SupabaseClient }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/venues/`, shouldCreateUser: true } });
    if (error) {
      setMessage(error.message);
      setState('error');
      return;
    }
    setState('sent');
  }
  return (
    <div className="max-w-md rounded-card border border-paper-edge bg-paper p-6">
      <h2 className="font-sans text-[17px] font-bold text-ink">Sign in with your work email.</h2>
      <p className="mt-1 text-[15px] text-ink-soft">We email you a link; there is no password. Use the address the events desk has for your venue.</p>
      {state === 'sent' ? (
        <p role="status" className="mt-4 rounded-card border border-ink bg-paper-sunk px-4 py-3 text-[15px] text-ink">
          Check {email.trim()} for a sign-in link. It works once and expires in an hour.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-4 grid gap-3">
          <div>
            <label htmlFor="venue-email" className="field-label">
              Work email
            </label>
            <input id="venue-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field-input" placeholder="you@venue.com" />
          </div>
          <button type="submit" className="btn-primary sm:w-auto" disabled={state === 'sending'}>
            {state === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
          </button>
          {state === 'error' ? (
            <p role="alert" className="text-sm text-ink">
              {message}
            </p>
          ) : null}
        </form>
      )}
    </div>
  );
}
