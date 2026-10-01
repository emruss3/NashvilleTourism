import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Browser Supabase client for the venue dashboard. Uses the publishable
 * (anon) key, which is public by design: every read and write it makes runs
 * under row level security as the signed-in venue user, so a venue sees and
 * edits only its own rows. Never the service role here.
 */
const PROJECT_REF = 'aeomrsutkhwmnscvvfur';
const DEFAULT_URL = `https://${PROJECT_REF}.supabase.co`;
const DEFAULT_PUBLISHABLE_KEY = 'sb_publishable_vTio-JIH2ezYw5ICvq-kSg_FV9Ja4dL';

let client: SupabaseClient | null = null;

export function supabaseBrowser(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || DEFAULT_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || DEFAULT_PUBLISHABLE_KEY;
  client = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } });
  return client;
}
