import { NextResponse } from 'next/server';
import { hasAdminSession } from '@/lib/admin-auth';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function back(req: Request, params: Record<string, string>) {
  const url = new URL('/admin/events', req.url);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url, { status: 303 });
}

/**
 * The desk marks a venue verified after a site visit or a call (or clears
 * it). The public badge shows only while verified_at is set. Separate from
 * approval: approval lets a venue publish; verification says we checked.
 */
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  if (!(await hasAdminSession())) return NextResponse.redirect(new URL('/admin/login', req.url), { status: 303 });
  const client = getSupabaseServiceClient();
  if (!client) return back(req, { error: 'Supabase is not configured' });
  if (!/^[0-9a-f-]{36}$/.test(id)) return back(req, { error: 'Bad venue id' });
  const form = await req.formData().catch(() => null);
  const clear = String(form?.get('clear') ?? '') === '1';

  const { data: venue } = await client.from('event_venues').select('id,name').eq('id', id).single();
  if (!venue) return back(req, { error: 'Venue not found' });
  const { error } = await client
    .from('event_venues')
    .update(clear ? { verified_at: null, verified_by: null } : { verified_at: new Date().toISOString(), verified_by: 'events desk' })
    .eq('id', id);
  if (error) return back(req, { error: `Could not update verification: ${error.message}` });
  return back(req, { ok: clear ? `${venue.name} is no longer marked verified.` : `${venue.name} marked verified.` });
}
