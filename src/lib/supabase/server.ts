/**
 * Server-only Supabase access for NashRoam.
 *
 * Never import this module from client components.
 * Never put SUPABASE_SERVICE_ROLE_KEY in NEXT_PUBLIC_*.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const PROJECT_REF = 'aeomrsutkhwmnscvvfur';
const DEFAULT_URL = `https://${PROJECT_REF}.supabase.co`;

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

export function isSupabaseConfigured(): boolean {
  return Boolean(serviceRoleKey());
}

/** Service-role client — bypasses RLS. Server routes / Server Components only. */
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
 * Invoke a Supabase Edge Function with the service role.
 * Viator credentials stay inside the function — never in Vercel.
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
  const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? 45_000);

  try {
    const res = await fetch(`${supabaseUrl()}/functions/v1/${name}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        'Content-Type': 'application/json',
      },
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
