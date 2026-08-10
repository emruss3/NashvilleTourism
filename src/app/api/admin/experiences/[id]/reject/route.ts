import { NextResponse } from 'next/server';
import { hasAdminSession } from '@/lib/admin-auth';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function redirectTo(req: Request, params: Record<string, string>) {
  const url = new URL('/admin/experiences', req.url);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!hasAdminSession()) {
    return NextResponse.redirect(new URL('/admin/login', req.url), { status: 303 });
  }

  const client = getSupabaseServiceClient();
  if (!client) return redirectTo(req, { error: 'supabase-not-configured' });

  const form = await req.formData().catch(() => null);
  const notes = String(form?.get('curationNotes') || '').trim();
  if (notes.length < 8) {
    return redirectTo(req, { error: 'rejection-reason-required', id: params.id });
  }

  const { error } = await client.rpc('reject_experience', {
    p_experience_id: params.id,
    p_curation_notes: notes,
  });

  if (error) return redirectTo(req, { error: 'rejection-failed', id: params.id });
  return redirectTo(req, { rejected: '1' });
}
