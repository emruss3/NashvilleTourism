import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { isBudgetRange, isEventType } from '@/lib/private-events';

export const dynamic = 'force-dynamic';

/**
 * Private event inquiry intake. Validates the form, stores the row in
 * `event_inquiries` with the service role, and answers with the id. Nothing
 * is emailed yet (no email provider is connected); the events desk reads
 * the table. A 503 tells the form to fall back to a mailto link rather than
 * claim the inquiry was received.
 */
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Body = Record<string, unknown>;

function text(body: Body, key: string, max: number): string | null {
  const v = body[key];
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  // Honeypot: real readers never see this field.
  if (text(body, 'website', 200)) return Response.json({ ok: true, id: null });

  const name = text(body, 'name', 120);
  const email = text(body, 'email', 254);
  const company = text(body, 'company', 160);
  const eventType = text(body, 'eventType', 40);
  const details = text(body, 'details', 4000);
  const budget = text(body, 'budget', 40);
  const preferredDate = text(body, 'preferredDate', 10);
  const sourcePath = text(body, 'sourcePath', 300);
  const guestsRaw = body.guests;
  const guests = typeof guestsRaw === 'number' ? guestsRaw : typeof guestsRaw === 'string' && guestsRaw.trim() ? Number(guestsRaw) : null;

  const errors: Record<string, string> = {};
  if (!name || name.length < 2) errors.name = 'Enter your name.';
  if (!email || !EMAIL.test(email)) errors.email = 'Enter a valid work email.';
  if (!isEventType(eventType)) errors.eventType = 'Choose an event type.';
  if (guests !== null && (!Number.isInteger(guests) || guests < 1 || guests > 5000)) errors.guests = 'Guests must be a whole number between 1 and 5,000.';
  if (preferredDate && (!ISO_DAY.test(preferredDate) || Number.isNaN(Date.parse(preferredDate)))) errors.preferredDate = 'Use a valid date.';
  if (budget && !isBudgetRange(budget)) errors.budget = 'Choose a budget range.';
  if (Object.keys(errors).length) return Response.json({ ok: false, error: 'validation', errors }, { status: 400 });

  const supabase = getSupabaseServiceClient();
  if (!supabase) return Response.json({ ok: false, error: 'not_configured' }, { status: 503 });

  const { data, error } = await supabase
    .from('event_inquiries')
    .insert({
      name,
      email,
      company,
      event_type: eventType,
      guests,
      preferred_date: preferredDate || null,
      flexible_dates: body.flexibleDates === true,
      budget_range: budget || null,
      details,
      need_hotel_rooms: body.needHotelRooms === true,
      source_path: sourcePath,
      user_agent: (req.headers.get('user-agent') ?? '').slice(0, 500) || null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[private-events] insert failed', error.message);
    return Response.json({ ok: false, error: 'storage' }, { status: 502 });
  }
  return Response.json({ ok: true, id: data.id });
}
