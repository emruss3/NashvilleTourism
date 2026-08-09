import { syncNashvilleCatalog } from '@/lib/feeds/viator';

/**
 * Admin/ops trigger for Nashville catalog sync via Edge Function.
 * Protected lightly by requiring a shared sync token when set.
 */
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const expected = process.env.NASHROAM_SYNC_TOKEN?.trim();
  if (expected) {
    const got = req.headers.get('x-nashroam-sync-token')?.trim();
    if (got !== expected) {
      return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
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
