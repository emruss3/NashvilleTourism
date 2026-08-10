import { NextResponse } from 'next/server';
import { hasAdminSession } from '@/lib/admin-auth';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function redirectTo(req: Request, params: Record<string, string>) {
  const url = new URL('/admin/experiences', req.url);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url, { status: 303 });
}

function list(value: FormDataEntryValue | null): string[] {
  return String(value || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!hasAdminSession()) {
    return NextResponse.redirect(new URL('/admin/login', req.url), { status: 303 });
  }

  const client = getSupabaseServiceClient();
  if (!client) return redirectTo(req, { error: 'supabase-not-configured' });

  const form = await req.formData().catch(() => null);
  if (!form) return redirectTo(req, { error: 'invalid-form' });

  const score = Number(form.get('nashroamScore'));
  const priority = Number(form.get('plannerPriority'));
  const localNote = String(form.get('localNote') || '').trim();
  const curationNotes = String(form.get('curationNotes') || '').trim();
  const bestFor = list(form.get('bestFor'));
  const travelerTypes = list(form.get('travelerTypes'));

  if (!Number.isFinite(score) || score < 0 || score > 100) {
    return redirectTo(req, { error: 'score-must-be-0-100', id: params.id });
  }
  if (!Number.isFinite(priority) || priority < 0 || priority > 100) {
    return redirectTo(req, { error: 'priority-must-be-0-100', id: params.id });
  }
  if (localNote.length < 12) {
    return redirectTo(req, { error: 'local-note-required', id: params.id });
  }

  const { error } = await client.rpc('approve_experience', {
    p_experience_id: params.id,
    p_nashroam_score: score,
    p_planner_priority: Math.round(priority),
    p_local_note: localNote,
    p_best_for: bestFor,
    p_traveler_types: travelerTypes,
    p_curation_notes: curationNotes || null,
  });

  if (error) {
    return redirectTo(req, { error: 'approval-failed', id: params.id });
  }

  return redirectTo(req, { approved: '1' });
}
