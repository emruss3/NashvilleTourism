/**
 * Per-IP fixed-window rate limiting for routes that turn into paid provider
 * calls (Viator search and availability).
 *
 * State lives in process memory, so on Vercel the window is per warm
 * instance rather than global. That still bounds a single client to
 * `limit` calls per instance per window, which is what stops a scripted
 * loop from draining API quota. A shared store (Upstash) is the launch
 * checklist item that makes this global; swap `store` for it then.
 */

type Window = { count: number; resetAt: number };

const MAX_KEYS = 5000;
const store = new Map<string, Window>();

function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

function sweep(now: number) {
  if (store.size < MAX_KEYS) return;
  for (const [key, win] of store) {
    if (win.resetAt <= now) store.delete(key);
  }
  // Still oversized after removing expired windows: drop the oldest entries.
  if (store.size >= MAX_KEYS) {
    const excess = store.size - MAX_KEYS + 1;
    let dropped = 0;
    for (const key of store.keys()) {
      store.delete(key);
      if (++dropped >= excess) break;
    }
  }
}

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the window resets. */
  retryAfter: number;
}

export function checkRateLimit(
  req: Request,
  { bucket, limit, windowMs }: { bucket: string; limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  const key = `${bucket}:${clientIp(req)}`;
  let win = store.get(key);
  if (!win || win.resetAt <= now) {
    sweep(now);
    win = { count: 0, resetAt: now + windowMs };
    store.set(key, win);
  }
  win.count += 1;
  const remaining = Math.max(0, limit - win.count);
  return {
    ok: win.count <= limit,
    limit,
    remaining,
    retryAfter: Math.max(1, Math.ceil((win.resetAt - now) / 1000)),
  };
}

/** Standard 429 body and headers for a rejected request. */
export function rateLimitResponse(result: RateLimitResult): Response {
  return Response.json(
    { error: 'Too many requests. Please slow down and try again shortly.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(result.retryAfter),
        'RateLimit-Limit': String(result.limit),
        'RateLimit-Remaining': String(result.remaining),
        'Cache-Control': 'no-store',
      },
    },
  );
}
