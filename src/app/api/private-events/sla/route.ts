import { timingSafeEqual } from 'node:crypto';
import { runSlaWatchdog } from '@/lib/events/sla-watchdog';

export const dynamic = 'force-dynamic';

/**
 * Hourly SLA watchdog, called by pg_cron (net.http_post) with the same
 * `x-nashroam-cron-token` the Supabase functions accept. The token lives in
 * Vault as `nashroam_cron_token` and in Vercel as NASHROAM_CRON_TOKEN.
 */
function authorized(req: Request): boolean {
  const expected = process.env.NASHROAM_CRON_TOKEN?.trim() ?? '';
  const given = req.headers.get('x-nashroam-cron-token')?.trim() ?? '';
  if (!expected || !given || expected.length !== given.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(given));
}

export async function POST(req: Request) {
  if (!authorized(req)) return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const report = await runSlaWatchdog();
  return Response.json({ ok: true, ...report });
}

export async function GET() {
  return Response.json({ ok: false, error: 'POST with x-nashroam-cron-token' }, { status: 405 });
}
