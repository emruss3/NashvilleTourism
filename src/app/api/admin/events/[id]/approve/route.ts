import { NextResponse } from 'next/server';
import { hasAdminSession } from '@/lib/admin-auth';
import { explainDbError } from '@/lib/events/publish-check';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function back(req: Request, params: Record<string, string>) {
  const url = new URL('/admin/events', req.url);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url, { status: 303 });
}

/** The desk approves a venue's first publish, optionally publishing it in the same step. */
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  if (!(await hasAdminSession())) return NextResponse.redirect(new URL('/admin/login', req.url), { status: 303 });
  const client = getSupabaseServiceClient();
  if (!client) return back(req, { error: 'Supabase is not configured' });
  if (!/^[0-9a-f-]{36}$/.test(id)) return back(req, { error: 'Bad venue id' });
  const form = await req.formData().catch(() => null);
  const publish = String(form?.get('publish') ?? '') === '1';

  const { data: venue } = await client.from('event_venues').select('id,name,approved_at').eq('id', id).single();
  if (!venue) return back(req, { error: 'Venue not found' });

  const now = new Date().toISOString();
  const approved = await client.from('event_venues').update({ approved_at: venue.approved_at ?? now, approved_by: 'events desk' }).eq('id', id);
  if (approved.error) return back(req, { error: `Approval failed: ${approved.error.message}` });

  if (publish) {
    const { error } = await client.from('event_venues').update({ published: true }).eq('id', id);
    if (error) return back(req, { ok: `${venue.name} approved.`, error: `Not published: ${explainDbError(error.message)}` });
    return back(req, { ok: `${venue.name} approved and published.` });
  }
  return back(req, { ok: `${venue.name} approved. The venue can publish itself now.` });
}
