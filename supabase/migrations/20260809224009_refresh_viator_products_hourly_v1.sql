select cron.unschedule('nashroam-viator-products');

select cron.schedule(
  'nashroam-viator-products',
  '17 * * * *',
  $$
  select net.http_post(
    url := 'https://aeomrsutkhwmnscvvfur.supabase.co/functions/v1/viator-sync',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-nashroam-cron-token',(select decrypted_secret from vault.decrypted_secrets where name='nashroam_cron_token')
    ),
    body := '{"mode":"sync_products","maxPages":3,"count":50,"limit":150,"sort":"DEFAULT","campaign":"catalog-sync"}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);

update public.ingestion_schedules s
set cadence = 'hourly',
    next_run_after = case when last_run_at is null then null else last_run_at + interval '1 hour' end,
    notes = 'Cron active: up to 3 pages / 150 products hourly using DEFAULT Viator ranking. One-hour cadence aligns catalog provider-state refresh with the one-hour display TTL.',
    updated_at = now()
from public.data_sources ds
where ds.id=s.source_id
  and ds.provider_key='viator'
  and s.job_key='viator_nashville_products';

create or replace function public.sync_ingestion_schedule_last_run()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.status = 'succeeded' and new.completed_at is not null then
    update public.ingestion_schedules
    set last_run_at = new.completed_at,
        next_run_after = case
          when job_key = 'viator_nashville_products' then new.completed_at + interval '1 hour'
          when job_key in ('viator_tags','viator_destinations') then new.completed_at + interval '7 days'
          else next_run_after
        end,
        updated_at = now()
    where source_id = new.source_id
      and job_key = new.job_type;
  end if;
  return new;
end;
$$;

revoke all on function public.sync_ingestion_schedule_last_run() from public, anon, authenticated;
grant execute on function public.sync_ingestion_schedule_last_run() to service_role;

update public.system_documents
set version = version + 1,
    content = jsonb_set(
      jsonb_set(
        content,
        '{active_automation}',
        jsonb_build_array(
          jsonb_build_object('job','nashroam-viator-products','cron','17 * * * *','action','up to 150 Nashville products hourly using DEFAULT ranking','timeout_ms',60000),
          jsonb_build_object('job','nashroam-viator-tags','cron','35 8 * * 0','action','weekly Viator tag taxonomy refresh','timeout_ms',30000),
          jsonb_build_object('job','nashroam-viator-destinations','cron','50 8 * * 0','action','weekly Viator destination refresh','timeout_ms',30000)
        ),
        true
      ),
      '{viator_refresh_reason}',
      to_jsonb('Product state uses a one-hour TTL; hourly catalog refresh keeps displayed provider state within that window. Viator rate-limit headers are per endpoint / per PUID rolling 10-second window, not a daily quota.'::text),
      true
    ),
    updated_at=now()
where document_key='data_refresh_strategy';
