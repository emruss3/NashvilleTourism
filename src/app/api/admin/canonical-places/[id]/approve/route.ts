import { NextResponse } from 'next/server';
import { hasAdminSession } from '@/lib/admin-auth';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function redirectTo(req: Request, params: Record<string, string>) {
  const url = new URL('/admin/places/canonical', req.url);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url, { status: 303 });
}
function list(value: FormDataEntryValue | null) {
  return String(value || '').split(',').map((x) => x.trim()).filter(Boolean).slice(0, 20);
}
function bool(value: FormDataEntryValue | null): boolean | null {
  const v = String(value || '');
  if (v === 'true') return true;
  if (v === 'false') return false;
  return null;
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!hasAdminSession()) return NextResponse.redirect(new URL('/admin/login', req.url), { status: 303 });
  const client = getSupabaseServiceClient();
  if (!client) return redirectTo(req, { error: 'supabase-not-configured' });
  const form = await req.formData().catch(() => null);
  if (!form) return redirectTo(req, { error: 'invalid-form', id: params.id });

  const score = Number(form.get('nashroamScore'));
  const priority = Number(form.get('plannerPriority'));
  const priceRaw = String(form.get('priceLevel') || '').trim();
  const durationRaw = String(form.get('typicalDurationMinutes') || '').trim();
  const summary = String(form.get('summary') || '').trim();
  const localNote = String(form.get('localNote') || '').trim();
  if (!Number.isFinite(score) || score < 0 || score > 100) return redirectTo(req, { error: 'score-must-be-0-100', id: params.id });
  if (!Number.isFinite(priority) || priority < 0 || priority > 100) return redirectTo(req, { error: 'priority-must-be-0-100', id: params.id });
  if (summary.length < 20) return redirectTo(req, { error: 'summary-required', id: params.id });
  if (localNote.length < 12) return redirectTo(req, { error: 'local-note-required', id: params.id });

  const { error } = await client.rpc('approve_place', {
    p_place_id: params.id,
    p_nashroam_score: score,
    p_planner_priority: Math.round(priority),
    p_summary: summary,
    p_local_note: localNote,
    p_best_for: list(form.get('bestFor')),
    p_traveler_types: list(form.get('travelerTypes')),
    p_vibe: list(form.get('vibe')),
    p_meal_periods: list(form.get('mealPeriods')),
    p_cuisine: list(form.get('cuisine')),
    p_price_level: priceRaw ? Number(priceRaw) : null,
    p_typical_duration_minutes: durationRaw ? Number(durationRaw) : null,
    p_family_friendly: bool(form.get('familyFriendly')),
    p_group_friendly: bool(form.get('groupFriendly')),
    p_reservation_recommended: bool(form.get('reservationRecommended')),
    p_reservation_url: String(form.get('reservationUrl') || '').trim() || null,
    p_curation_notes: String(form.get('curationNotes') || '').trim() || null,
  });
  if (error) return redirectTo(req, { error: 'approval-failed', id: params.id });
  return redirectTo(req, { approved: '1' });
}
