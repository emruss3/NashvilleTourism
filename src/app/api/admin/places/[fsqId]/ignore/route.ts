import { NextResponse } from 'next/server';
import { hasAdminSession } from '@/lib/admin-auth';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function redirectTo(req: Request, params: Record<string, string>) {
  const url = new URL('/admin/places/fsq', req.url);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(req: Request, { params }: { params: { fsqId: string } }) {
  if (!hasAdminSession()) {
    return NextResponse.redirect(new URL('/admin/login', req.url), { status: 303 });
  }

  const client = getSupabaseServiceClient();
  if (!client) return redirectTo(req, { error: 'supabase-not-configured' });

  const form = await req.formData().catch(() => null);
  const notes = String(form?.get('reviewNotes') || '').trim();
  if (notes.length < 4) {
    return redirectTo(req, { error: 'ignore-reason-required', id: params.fsqId });
  }

  const { error } = await client.rpc('ignore_fsq_os_candidate', {
    p_fsq_place_id: params.fsqId,
    p_notes: notes,
  });

  if (error) return redirectTo(req, { error: 'ignore-failed', id: params.fsqId });
  return redirectTo(req, { ignored: '1' });
}
