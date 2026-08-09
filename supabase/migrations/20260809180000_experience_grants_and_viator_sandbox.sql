-- Service-role grants for experience tables + mark Viator sandbox base URL.
-- RLS remains enabled with no anon/authenticated policies.

grant all on table
  public.experiences,
  public.experience_editorial,
  public.experience_source_ids,
  public.experience_source_state,
  public.viator_destinations,
  public.ingestion_cursors
to service_role;

revoke all on table
  public.experiences,
  public.experience_editorial,
  public.experience_source_ids,
  public.experience_source_state,
  public.viator_destinations,
  public.ingestion_cursors
from anon, authenticated;

update public.data_sources
set
  base_url = 'https://api.sandbox.viator.com/partner',
  notes = 'Basic Access Affiliate sandbox. Nashville destination 799 (lookupId 8.77.295.799). Next.js must call via Edge Function viator-sync — never call Viator production with the sandbox key. Preserve productUrl exactly for affiliate attribution.',
  updated_at = now()
where provider_key = 'viator';
