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
  if (!form) return redirectTo(req, { error: 'invalid-form' });

  const primaryCategory = String(form.get('primaryCategory') || '').trim();
  const neighborhoodId = String(form.get('neighborhoodId') || '').trim() || null;
  const existingPlaceId = String(form.get('existingPlaceId') || '').trim() || null;

  if (!primaryCategory) {
    return redirectTo(req, { error: 'primary-category-required', id: params.fsqId });
  }

  const { error } = await client.rpc('promote_fsq_os_candidate', {
    p_fsq_place_id: params.fsqId,
    p_primary_category: primaryCategory,
    p_neighborhood_id: neighborhoodId,
    p_existing_place_id: existingPlaceId,
  });

  if (error) return redirectTo(req, { error: 'promotion-failed', id: params.fsqId });
  return redirectTo(req, { promoted: '1' });
}
