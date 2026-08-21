import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Legacy Viator catalog ingestion endpoint.
 *
 * Disabled intentionally. NashRoam uses Viator's real-time search model and
 * must not ingest catalog or availability data with search endpoints. Keeping a
 * fail-closed stub prevents an old cron/manual caller from re-enabling the
 * mixed ingestion + real-time pattern that Viator prohibits.
 */

Deno.serve(() =>
  new Response(
    JSON.stringify({
      ok: false,
      disabled: true,
      endpointModel: "real-time-search",
      error:
        "Viator catalog ingestion is disabled. Use viator-live for user-initiated search/detail and viator-availability for a selected product.",
    }),
    {
      status: 410,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    },
  ),
);
