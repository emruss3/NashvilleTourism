/**
 * Server-only Supabase access for NashRoam.
 *
 * Never import this module from client components.
 * Never put SUPABASE_SERVICE_ROLE_KEY in NEXT_PUBLIC_*.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const PROJECT_REF = 'aeomrsutkhwmnscvvfur';
const DEFAULT_URL = `https://${PROJECT_REF}.supabase.co`;
const DEFAULT_EDGE_TIMEOUT_MS = 120_000;

function supabaseUrl(): string {
  return (
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    DEFAULT_URL
  );
}

function serviceRoleKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || undefined;
}

function isLegacyJwtKey(key: string): boolean {
  return key.startsWith('eyJ');
}

export function isSupabaseConfigured(): boolean {
  return Boolean(serviceRoleKey());
}

/** Service-role/secret-key client — bypasses RLS. Server routes / Server Components only. */
export function getSupabaseServiceClient(): SupabaseClient | null {
  const key = serviceRoleKey();
  if (!key) return null;
  return createClient(supabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type EdgeFunctionResult<T> = {
  ok: boolean;
  status: number;
  data: T;
};

/**
 * Invoke a Supabase Edge Function using the server credential stored in Vercel.
 *
 * Supabase's current sb_secret_* keys are API keys, not JWTs. They belong on the
 * `apikey` header only. Legacy service_role JWTs may also be sent as Bearer
 * tokens. The Edge Function itself validates either form.
 *
 * Viator credentials stay inside Supabase — never in Vercel. The default
 * timeout is 120 seconds to match Viator's API-service certification guidance.
 */
export async function invokeEdgeFunction<T = unknown>(
  name: string,
  body: Record<string, unknown>,
  init: { timeoutMs?: number } = {},
): Promise<EdgeFunctionResult<T>> {
  const key = serviceRoleKey();
  if (!key) {
    return {
      ok: false,
      status: 503,
      data: { ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY is not configured' } as T,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? DEFAULT_EDGE_TIMEOUT_MS);

  try {
    const headers: Record<string, string> = {
      apikey: key,
      'Content-Type': 'application/json',
    };
    if (isLegacyJwtKey(key)) {
      headers.Authorization = `Bearer ${key}`;
    }

    const res = await fetch(`${supabaseUrl()}/functions/v1/${name}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
    });

    let data: T;
    try {
      data = (await res.json()) as T;
    } catch {
      data = { ok: false, error: `Non-JSON response (${res.status})` } as T;
    }

    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Edge Function network error';
    return {
      ok: false,
      status: 502,
      data: { ok: false, error: message } as T,
    };
  } finally {
    clearTimeout(timer);
  }
}
