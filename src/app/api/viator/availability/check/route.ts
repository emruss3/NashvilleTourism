import { normalizeViatorAvailabilityQuote } from '@/lib/feeds/viator-availability';
import { invokeEdgeFunction, isSupabaseConfigured } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const AGE_BANDS = new Set([
  'ADULT',
  'CHILD',
  'INFANT',
  'YOUTH',
  'SENIOR',
  'TRAVELER',
]);

type PaxEntry = {
  ageBand: string;
  numberOfTravelers: number;
};

type CheckEnvelope = {
  ok?: boolean;
  availability?: unknown;
  error?: unknown;
  environment?: string;
  fullAccessRequired?: boolean;
  rateLimitRemaining?: string | null;
  retryAfter?: string | null;
};

function validProductCode(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{2,80}$/.test(value.trim());
}

function validDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

function cleanPaxMix(value: unknown): PaxEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry): PaxEntry | null => {
      if (!entry || typeof entry !== 'object') return null;
      const raw = entry as Record<string, unknown>;
      const ageBand = String(raw.ageBand ?? '').trim().toUpperCase();
      const numberOfTravelers = Math.floor(Number(raw.numberOfTravelers));
      if (!AGE_BANDS.has(ageBand)) return null;
      if (!Number.isFinite(numberOfTravelers) || numberOfTravelers < 1 || numberOfTravelers > 50) {
        return null;
      }
      return { ageBand, numberOfTravelers };
    })
    .filter((entry): entry is PaxEntry => Boolean(entry));
}

function safeError(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of ['message', 'error', 'errorMessage', 'title']) {
      if (typeof record[key] === 'string') return record[key] as string;
    }
  }
  return undefined;
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return Response.json(
      { configured: false, live: false, error: 'Supabase not configured' },
      { status: 503 },
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ configured: true, live: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const productCode = validProductCode(body.productCode) ? body.productCode.trim() : '';
  const travelDate = validDate(body.travelDate) ? body.travelDate.trim() : '';
  const paxMix = cleanPaxMix(body.paxMix);

  if (!productCode || !travelDate || !paxMix.length) {
    return Response.json(
      {
        configured: true,
        live: false,
        error: 'productCode, travelDate, and at least one traveler are required',
      },
      { status: 400 },
    );
  }

  const payload: Record<string, unknown> = {
    mode: 'check_availability',
    productCode,
    travelDate,
    paxMix,
    currency:
      typeof body.currency === 'string' && /^[A-Za-z]{3}$/.test(body.currency)
        ? body.currency.toUpperCase()
        : 'USD',
  };

  if (typeof body.productOptionCode === 'string' && body.productOptionCode.trim()) {
    payload.productOptionCode = body.productOptionCode.trim().slice(0, 100);
  }
  if (typeof body.startTime === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(body.startTime)) {
    payload.startTime = body.startTime;
  }

  const result = await invokeEdgeFunction<CheckEnvelope>('viator-availability', payload);
  const fullAccessRequired = Boolean(
    result.data?.fullAccessRequired || [401, 403, 404].includes(result.status),
  );

  if (!result.ok || !result.data?.ok || !result.data?.availability) {
    return Response.json(
      {
        configured: true,
        live: false,
        fullAccessRequired,
        checkoutManagedBy: 'viator',
        transactional: false,
        environment: result.data?.environment,
        rateLimitRemaining: result.data?.rateLimitRemaining,
        retryAfter: result.data?.retryAfter,
        error: fullAccessRequired
          ? 'Viator Full-access Affiliate approval is required for real-time traveler quotes.'
          : safeError(result.data?.error) ?? `Viator availability check failed (${result.status})`,
      },
      {
        status: fullAccessRequired ? 403 : result.status || 502,
        headers: { 'Cache-Control': 'private, no-store' },
      },
    );
  }

  const quote = normalizeViatorAvailabilityQuote(result.data.availability);
  return Response.json(
    {
      configured: true,
      live: true,
      fullAccessRequired: false,
      checkoutManagedBy: 'viator',
      transactional: false,
      productCode,
      travelDate,
      quote,
      environment: result.data.environment,
      rateLimitRemaining: result.data.rateLimitRemaining,
      provenance: {
        providerKey: 'viator',
        externalId: productCode,
        fetchedAt: new Date().toISOString(),
        volatileFields: ['availability', 'price', 'startTime'],
      },
    },
    {
      status: 200,
      headers: { 'Cache-Control': 'private, no-store' },
    },
  );
}
