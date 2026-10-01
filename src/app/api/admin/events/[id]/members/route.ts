import { NextResponse } from 'next/server';
import { hasAdminSession } from '@/lib/admin-auth';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function back(req: Request, params: Record<string, string>) {
  const url = new URL('/admin/events', req.url);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url, { status: 303 });
}

/** Add or remove the people who may edit a venue in /venues/, by email. */
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  if (!(await hasAdminSession())) return NextResponse.redirect(new URL('/admin/login', req.url), { status: 303 });
  const client = getSupabaseServiceClient();
  if (!client) return back(req, { error: 'Supabase is not configured' });
  if (!/^[0-9a-f-]{36}$/.test(id)) return back(req, { error: 'Bad venue id' });
  const form = await req.formData().catch(() => null);
  const action = String(form?.get('action') ?? 'add');

  if (action === 'remove') {
    const memberId = String(form?.get('memberId') ?? '');
    const { error } = await client.from('event_venue_users').delete().eq('id', memberId).eq('venue_id', id);
    return back(req, error ? { error: `Could not remove: ${error.message}` } : { ok: 'Removed.' });
  }

  const email = String(form?.get('email') ?? '').trim().toLowerCase();
  const role = String(form?.get('role') ?? 'sales') === 'owner' ? 'owner' : 'sales';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return back(req, { error: 'Enter a valid email' });
  const { error } = await client.from('event_venue_users').upsert({ venue_id: id, email, role }, { onConflict: 'venue_id,email' });
  if (error) return back(req, { error: `Could not add: ${error.message}` });
  return back(req, { ok: `${email} can now sign in at /venues/ and edit this venue.` });
}
