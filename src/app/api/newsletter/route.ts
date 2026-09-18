import { getSupabaseServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Newsletter sign-up. Stores the address in `subscribers` (citext email,
 * source, consent timestamp) with the service role. Re-subscribing an
 * address that already exists is a no-op that still reports success, so a
 * reader never learns whether someone else's address is on the list.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 254) : '';
  const source = typeof body.source === 'string' ? body.source.trim().slice(0, 80) || 'site' : 'site';
  if (!EMAIL.test(email)) return Response.json({ ok: false, error: 'invalid_email' }, { status: 400 });
  if (typeof body.website === 'string' && body.website.trim()) return Response.json({ ok: true });

  const supabase = getSupabaseServiceClient();
  if (!supabase) return Response.json({ ok: false, error: 'not_configured' }, { status: 503 });

  const existing = await supabase.from('subscribers').select('id, unsubscribed_at').eq('email', email).limit(1).maybeSingle();
  if (existing.error) {
    console.error('[newsletter] lookup failed', existing.error.message);
    return Response.json({ ok: false, error: 'storage' }, { status: 502 });
  }
  if (existing.data) {
    if (existing.data.unsubscribed_at) {
      const { error } = await supabase.from('subscribers').update({ unsubscribed_at: null, consent_at: new Date().toISOString(), source }).eq('id', existing.data.id);
      if (error) return Response.json({ ok: false, error: 'storage' }, { status: 502 });
    }
    return Response.json({ ok: true });
  }
  const { error } = await supabase.from('subscribers').insert({ email, source });
  if (error) {
    console.error('[newsletter] insert failed', error.message);
    return Response.json({ ok: false, error: 'storage' }, { status: 502 });
  }
  return Response.json({ ok: true });
}
