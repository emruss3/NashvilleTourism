select cron.schedule(
  'nashroam-viator-products',
  '17 */6 * * *',
  $$
  select net.http_post(
    url := 'https://aeomrsutkhwmnscvvfur.supabase.co/functions/v1/viator-sync',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-nashroam-cron-token',(select decrypted_secret from vault.decrypted_secrets where name='nashroam_cron_token')
    ),
    body := '{"mode":"sync_products","maxPages":3,"count":50,"limit":150,"sort":"DEFAULT","campaign":"catalog-sync"}'::jsonb
  );
  $$
);

select cron.schedule(
  'nashroam-viator-tags',
  '35 8 * * 0',
  $$
  select net.http_post(
    url := 'https://aeomrsutkhwmnscvvfur.supabase.co/functions/v1/viator-sync',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-nashroam-cron-token',(select decrypted_secret from vault.decrypted_secrets where name='nashroam_cron_token')
    ),
    body := '{"mode":"sync_tags"}'::jsonb
  );
  $$
);

select cron.schedule(
  'nashroam-viator-destinations',
  '50 8 * * 0',
  $$
  select net.http_post(
    url := 'https://aeomrsutkhwmnscvvfur.supabase.co/functions/v1/viator-sync',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-nashroam-cron-token',(select decrypted_secret from vault.decrypted_secrets where name='nashroam_cron_token')
    ),
    body := '{"mode":"sync_destinations"}'::jsonb
  );
  $$
);

update public.ingestion_schedules s
set enabled = true,
    cadence = case s.job_key
      when 'viator_nashville_products' then 'every 6 hours'
      else 'weekly'
    end,
    notes = case s.job_key
      when 'viator_nashville_products' then 'Cron active: 3 pages / 150 products maximum every six hours using DEFAULT Viator ranking. Source state remains expiring; planner may use on-demand checks for final candidates.'
      when 'viator_tags' then 'Cron active: weekly Sunday UTC refresh via protected viator-sync Edge Function.'
      when 'viator_destinations' then 'Cron active: weekly Sunday UTC refresh via protected viator-sync Edge Function.'
      else s.notes
    end,
    updated_at = now()
from public.data_sources ds
where ds.id = s.source_id
  and ds.provider_key = 'viator'
  and s.job_key in ('viator_nashville_products','viator_tags','viator_destinations');
