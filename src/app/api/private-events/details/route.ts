import { eventsEnv, sendEmail } from '@/lib/events/notify';
import { verifyDetailsToken } from '@/lib/events/magic-link';
import type { Need } from '@/lib/events/types';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { neighborhoods } from '@/lib/content/neighborhoods';
import { BUDGET_RANGES, NEEDS, START_TIME_BANDS, isBudgetRange } from '@/lib/private-events';

export const dynamic = 'force-dynamic';

/**
 * The planner's "add detail" form posts here from the signed link in their
 * confirmation email. Updates the optional fields on the inquiry and tells
 * the desk; venues that already hold the lead hear from the desk, not from
 * an automated resend.
 */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const token = String(form?.get('token') ?? '');
  const back = (state: string) => Response.redirect(new URL(`/private-events/brief/details/${encodeURIComponent(token || '-')}/?${state}`, req.url), 303);
  const verified = verifyDetailsToken(token);
  if ('error' in verified) return back(`error=${verified.error}`);
  const supabase = getSupabaseServiceClient();
  if (!supabase) return back('error=not_configured');

  const text = (key: string, max: number) => String(form?.get(key) ?? '').trim().slice(0, max) || null;
  const list = (key: string) => (form?.getAll(key) ?? []).map((v) => String(v).trim()).filter(Boolean);
  const hoodSlugs = new Set<string>(neighborhoods.map((n) => n.slug));
  const needSet = new Set(NEEDS.map((n) => n.value));
  const budget = text('budget', 40);
  const startTimeBand = text('startTimeBand', 20);
  const patch: Record<string, unknown> = {
    budget_range: budget && isBudgetRange(budget) ? budget : null,
    neighborhood_pref: list('neighborhoods').filter((s) => hoodSlugs.has(s)).slice(0, 6),
    needs: list('needs').filter((n): n is Need => needSet.has(n as Need)).slice(0, 6),
    start_time_band: startTimeBand && START_TIME_BANDS.some((b) => b.value === startTimeBand) ? startTimeBand : null,
    planner_phone: text('phone', 40),
    planner_org: text('company', 160),
    details: text('details', 4000),
    updated_at: new Date().toISOString(),
  };
  patch.need_hotel_rooms = (patch.needs as string[]).includes('rooms');

  const { data: inquiry } = await supabase.from('event_inquiries').select('id,reference,name,email').eq('id', verified.inquiryId).single();
  if (!inquiry) return back('error=missing');
  const { error } = await supabase.from('event_inquiries').update(patch).eq('id', verified.inquiryId);
  if (error) return back('error=storage');

  const env = eventsEnv();
  if (env.desk) {
    const budgetLabel = BUDGET_RANGES.find((b) => b.value === patch.budget_range)?.label;
    await sendEmail(
      {
        to: env.desk,
        replyTo: String(inquiry.email),
        subject: `[desk] ${String(inquiry.name)} added detail to ${String(inquiry.reference ?? verified.inquiryId)}`,
        text: [
          `Budget: ${budgetLabel ?? 'not given'}`,
          `Neighborhoods: ${(patch.neighborhood_pref as string[]).join(', ') || 'any'}`,
          `Needs: ${(patch.needs as string[]).join(', ') || 'none listed'}`,
          `Start: ${patch.start_time_band ?? 'not set'}`,
          `Organization: ${patch.planner_org ?? '-'}`,
          `Phone: ${patch.planner_phone ?? '-'}`,
          '',
          patch.details ? `Notes:\n${patch.details}` : 'No notes.',
          '',
          'Pass anything the venues need on to them; nothing was resent automatically.',
        ].join('\n'),
        tags: { kind: 'planner_details', reference: String(inquiry.reference ?? '') },
      },
      'planner_details',
    );
  }
  return back('done=1');
}
