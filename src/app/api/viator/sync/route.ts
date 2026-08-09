import { syncNashvilleCatalog } from '@/lib/feeds/viator';

/**
 * Optional manual/admin trigger for the Supabase Viator sync.
 *
 * Normal maintenance runs through Supabase Cron. This endpoint fails closed:
 * it is disabled unless NASHROAM_SYNC_TOKEN is explicitly configured.
 */
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const expected = process.env.NASHROAM_SYNC_TOKEN?.trim();
  if (!expected) {
    return Response.json(
      { ok: false, error: 'Manual sync endpoint is disabled; Supabase Cron handles scheduled refreshes.' },
      { status: 503 },
    );
  }

  const got = req.headers.get('x-nashroam-sync-token')?.trim();
  if (!got || got !== expected) {
    return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: { maxPages?: number; limit?: number; startDate?: string; endDate?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const result = await syncNashvilleCatalog(body);
  return Response.json(result, { status: result.ok ? 200 : result.httpStatus || 502 });
}
