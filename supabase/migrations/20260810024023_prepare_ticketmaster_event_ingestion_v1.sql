alter table public.events
  add column if not exists time_tbd boolean not null default false;

insert into public.ingestion_schedules(source_id,job_key,cadence,enabled,priority,notes)
select id,'ticketmaster_nashville_events','every 3 hours',false,85,
  'Prepared for Supabase ticketmaster-sync Edge Function. Enable only after TICKETMASTER_API_KEY is configured and a live Nashville sync is verified.'
from public.data_sources where provider_key='ticketmaster'
on conflict (source_id,job_key) do update set
  cadence=excluded.cadence,
  enabled=false,
  priority=excluded.priority,
  notes=excluded.notes,
  updated_at=now();

create index if not exists events_time_tbd_idx
  on public.events(time_tbd, starts_at)
  where time_tbd = true;
