import { submitInquiry, type IntakeInput } from '@/lib/events/intake';
import type { Need, Occasion } from '@/lib/events/types';
import { isBudgetRange, isEventType } from '@/lib/private-events';
import { neighborhoods } from '@/lib/content/neighborhoods';

export const dynamic = 'force-dynamic';

/**
 * Private event inquiry intake for the quick form and the brief. Validates,
 * stores the inquiry, creates one lead per venue, routes each lead by the
 * venue's lead system, and emails the desk, group hotels and the planner.
 * Email failures are returned as `warnings`, never as a failed intake. A 503
 * (no service role) tells the form to fall back to a mailto link.
 */
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OCCASIONS = new Set<Occasion>(['corporate', 'holiday', 'convention', 'celebration', 'bachelorette', 'rehearsal_dinner', 'welcome_party', 'other']);
const NEEDS = new Set<Need>(['food', 'music', 'av', 'outdoor', 'accessible', 'rooms']);
const START_BANDS = new Set(['morning', 'lunch', 'afternoon', 'evening', 'late']);

type Body = Record<string, unknown>;

function text(body: Body, key: string, max: number): string | null {
  const v = body[key];
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

function list(body: Body, key: string, max: number): string[] {
  const v = body[key];
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string').map((x) => x.trim()).filter(Boolean).slice(0, max);
  if (typeof v === 'string') return v.split(',').map((x) => x.trim()).filter(Boolean).slice(0, max);
  return [];
}

/**
 * Per-instance rate limit: a serverless instance remembers the last few
 * minutes. Coarse on purpose; the honeypot does the rest.
 */
const recent = new Map<string, number[]>();
function rateLimited(ip: string, now = Date.now()): boolean {
  const window = 10 * 60_000;
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < window);
  hits.push(now);
  recent.set(ip, hits);
  if (recent.size > 5000) recent.clear();
  return hits.length > 6;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  // Honeypot: real readers never see this field. Answer as if accepted, route nothing.
  if (text(body, 'website', 200)) return Response.json({ ok: true, id: null, reference: null, venues: [] });

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) return Response.json({ ok: false, error: 'rate_limited' }, { status: 429 });

  const name = text(body, 'name', 120);
  const email = text(body, 'email', 254);
  const company = text(body, 'company', 160);
  const phone = text(body, 'phone', 40);
  const eventType = text(body, 'eventType', 40);
  const occasion = text(body, 'occasion', 40);
  const details = text(body, 'details', 4000);
  const budget = text(body, 'budget', 40);
  const preferredDate = text(body, 'preferredDate', 10);
  const startTimeBand = text(body, 'startTimeBand', 20);
  const howHeard = text(body, 'howHeard', 120);
  const sourcePath = text(body, 'sourcePath', 300);
  const clientReference = text(body, 'clientReference', 80);
  const guestsRaw = body.guests;
  const guests = typeof guestsRaw === 'number' ? guestsRaw : typeof guestsRaw === 'string' && guestsRaw.trim() ? Number(guestsRaw) : null;
  const hoodSlugs = new Set<string>(neighborhoods.map((n) => n.slug));
  const hoods = list(body, 'neighborhoods', 6).filter((s) => hoodSlugs.has(s));
  const needs = list(body, 'needs', 6).filter((n): n is Need => NEEDS.has(n as Need));
  const venueSlugs = list(body, 'venueSlugs', 5).filter((s) => /^[a-z0-9-]{2,80}$/.test(s));
  const utmRaw = body.utm;
  const utm =
    utmRaw && typeof utmRaw === 'object' && !Array.isArray(utmRaw)
      ? Object.fromEntries(
          Object.entries(utmRaw as Record<string, unknown>)
            .filter(([k, v]) => /^utm_[a-z]+$/.test(k) && typeof v === 'string')
            .map(([k, v]) => [k, String(v).slice(0, 120)]),
        )
      : undefined;

  const errors: Record<string, string> = {};
  if (!name || name.length < 2) errors.name = 'Enter your name.';
  if (!email || !EMAIL.test(email)) errors.email = 'Enter a valid work email.';
  if (!isEventType(eventType)) errors.eventType = 'Choose an event type.';
  if (occasion && !OCCASIONS.has(occasion as Occasion)) errors.occasion = 'Choose an occasion.';
  if (guests !== null && (!Number.isInteger(guests) || guests < 1 || guests > 5000)) errors.guests = 'Guests must be a whole number between 1 and 5,000.';
  if (preferredDate && (!ISO_DAY.test(preferredDate) || Number.isNaN(Date.parse(preferredDate)))) errors.preferredDate = 'Use a valid date.';
  if (budget && !isBudgetRange(budget)) errors.budget = 'Choose a budget range.';
  if (startTimeBand && !START_BANDS.has(startTimeBand)) errors.startTimeBand = 'Choose a start time.';
  if (Object.keys(errors).length) return Response.json({ ok: false, error: 'validation', errors }, { status: 400 });

  const needHotelRooms = body.needHotelRooms === true || needs.includes('rooms');
  const input: IntakeInput = {
    name: name!,
    email: email!,
    company: company ?? undefined,
    phone: phone ?? undefined,
    eventType: eventType as string,
    occasion: (occasion as Occasion | null) ?? undefined,
    guests: guests ?? undefined,
    preferredDate: preferredDate ?? undefined,
    flexibleDates: body.flexibleDates === true,
    startTimeBand: startTimeBand ?? undefined,
    budget: budget ?? undefined,
    neighborhoods: hoods,
    needs: needHotelRooms && !needs.includes('rooms') ? [...needs, 'rooms'] : needs,
    details: details ?? undefined,
    needHotelRooms,
    venueSlugs,
    suggest: body.suggest !== false,
    howHeard: howHeard ?? undefined,
    sourcePath: sourcePath ?? undefined,
    userAgent: (req.headers.get('user-agent') ?? '').slice(0, 500) || undefined,
    utm,
    clientReference: clientReference ?? undefined,
  };

  const outcome = await submitInquiry(input);
  if (!outcome.ok) {
    if (outcome.error === 'not_configured') return Response.json({ ok: false, error: 'not_configured' }, { status: 503 });
    console.error('[private-events] intake failed', outcome.detail);
    return Response.json({ ok: false, error: 'storage' }, { status: 502 });
  }
  if (outcome.result.warnings.length) console.warn('[private-events]', outcome.result.reference, outcome.result.warnings.join(' | '));
  return Response.json({ ok: true, id: outcome.result.id, reference: outcome.result.reference, venues: outcome.result.venues, warnings: outcome.result.warnings });
}
