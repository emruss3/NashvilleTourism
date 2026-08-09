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
          when job_key = 'viator_nashville_products' then new.completed_at + interval '6 hours'
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

drop trigger if exists ingestion_runs_sync_schedule_last_run on public.ingestion_runs;
create trigger ingestion_runs_sync_schedule_last_run
after insert or update of status, completed_at on public.ingestion_runs
for each row execute function public.sync_ingestion_schedule_last_run();

with latest as (
  select distinct on (source_id, job_type)
    source_id, job_type, completed_at
  from public.ingestion_runs
  where status='succeeded' and completed_at is not null
  order by source_id, job_type, completed_at desc
)
update public.ingestion_schedules s
set last_run_at = l.completed_at,
    next_run_after = case
      when s.job_key='viator_nashville_products' then l.completed_at + interval '6 hours'
      when s.job_key in ('viator_tags','viator_destinations') then l.completed_at + interval '7 days'
      else s.next_run_after
    end,
    updated_at = now()
from latest l
where s.source_id=l.source_id and s.job_key=l.job_type;
