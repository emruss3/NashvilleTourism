create table if not exists public.viator_tags (
  tag_id bigint primary key,
  name text,
  parent_tag_id bigint,
  group_name text,
  raw jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.viator_tags enable row level security;
revoke all on public.viator_tags from anon, authenticated;
grant all on public.viator_tags to service_role;
create trigger viator_tags_set_updated_at before update on public.viator_tags for each row execute function public.set_updated_at();

alter table public.experiences add column if not exists curation_status text not null default 'pending' check (curation_status in ('pending','approved','rejected','needs_review'));
alter table public.experiences add column if not exists curation_notes text;
alter table public.experiences add column if not exists approved_at timestamptz;
create index if not exists experiences_curation_idx on public.experiences(curation_status,is_published,status);

create table if not exists public.ingestion_schedules (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.data_sources(id) on delete cascade,
  job_key text not null,
  cadence text not null,
  enabled boolean not null default false,
  priority smallint not null default 50 check (priority between 0 and 100),
  last_run_at timestamptz,
  next_run_after timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source_id,job_key)
);
alter table public.ingestion_schedules enable row level security;
revoke all on public.ingestion_schedules from anon, authenticated;
grant all on public.ingestion_schedules to service_role;
create trigger ingestion_schedules_set_updated_at before update on public.ingestion_schedules for each row execute function public.set_updated_at();

insert into public.ingestion_schedules(source_id,job_key,cadence,enabled,priority,notes)
select id,'viator_tags','weekly',false,60,'Enable after scheduled Edge Function invocation is configured.' from public.data_sources where provider_key='viator'
on conflict (source_id,job_key) do nothing;
insert into public.ingestion_schedules(source_id,job_key,cadence,enabled,priority,notes)
select id,'viator_destinations','weekly',false,50,'Viator recommends weekly destination refresh.' from public.data_sources where provider_key='viator'
on conflict (source_id,job_key) do nothing;
insert into public.ingestion_schedules(source_id,job_key,cadence,enabled,priority,notes)
select id,'viator_nashville_products','daily',false,80,'Basic Access uses /products/search; refresh curated Nashville catalog without attempting full catalog ingestion.' from public.data_sources where provider_key='viator'
on conflict (source_id,job_key) do nothing;

create or replace view public.experience_curation_queue with (security_invoker=true) as
select
  e.id,
  e.slug,
  e.title,
  e.status,
  e.is_published,
  e.curation_status,
  e.curation_notes,
  ee.nashroam_score,
  ee.planner_priority,
  esi.external_id as viator_product_code,
  esi.external_url as viator_product_url,
  ess.rating_value,
  ess.review_count,
  ess.from_price,
  ess.currency,
  ess.fetched_at,
  ess.expires_at,
  ess.metadata->>'image_url' as image_url,
  ess.metadata->'tags' as provider_tags,
  ess.metadata->'flags' as provider_flags
from public.experiences e
left join public.experience_editorial ee on ee.experience_id=e.id
left join public.experience_source_ids esi on esi.experience_id=e.id
left join public.data_sources ds on ds.id=esi.source_id and ds.provider_key='viator'
left join public.experience_source_state ess on ess.experience_id=e.id and ess.source_id=esi.source_id
where ds.provider_key='viator';
revoke all on public.experience_curation_queue from anon, authenticated;
grant select on public.experience_curation_queue to service_role;

create or replace view public.source_health with (security_invoker=true) as
select
  ds.provider_key,
  ds.name,
  ds.active,
  ds.source_type,
  ds.default_ttl_minutes,
  max(ir.completed_at) as last_completed_run,
  count(ir.id) filter (where ir.status='failed' and ir.started_at > now()-interval '7 days') as failed_runs_7d,
  count(ir.id) filter (where ir.status='succeeded' and ir.started_at > now()-interval '7 days') as successful_runs_7d
from public.data_sources ds
left join public.ingestion_runs ir on ir.source_id=ds.id
group by ds.id;
revoke all on public.source_health from anon, authenticated;
grant select on public.source_health to service_role;

with seed(slug,name,hood,category) as (
 values
 ('ryman-auditorium','Ryman Auditorium','downtown','venue'),
 ('country-music-hall-of-fame','Country Music Hall of Fame and Museum','sobro','attraction'),
 ('national-museum-african-american-music','National Museum of African American Music','downtown','attraction'),
 ('frist-art-museum','Frist Art Museum','downtown','attraction'),
 ('johnny-cash-museum','Johnny Cash Museum','downtown','attraction'),
 ('grand-ole-opry-house','Grand Ole Opry House','music-valley','venue'),
 ('bluebird-cafe','The Bluebird Cafe','green-hills','venue'),
 ('station-inn','The Station Inn','the-gulch','venue'),
 ('bridgestone-arena','Bridgestone Arena','downtown','venue'),
 ('ascend-amphitheater','Ascend Amphitheater','sobro','venue'),
 ('nissan-stadium','Nissan Stadium',null,'venue'),
 ('geodis-park','GEODIS Park','wedgewood-houston','venue'),
 ('first-horizon-park','First Horizon Park','germantown','venue'),
 ('nashville-farmers-market','Nashville Farmers’ Market','germantown','attraction'),
 ('tennessee-state-museum','Tennessee State Museum','germantown','attraction'),
 ('the-parthenon','The Parthenon','west-end','attraction'),
 ('centennial-park','Centennial Park','west-end','park'),
 ('cheekwood-estate-gardens','Cheekwood Estate & Gardens','green-hills','attraction'),
 ('nashville-zoo','Nashville Zoo at Grassmere',null,'attraction'),
 ('shelby-bottoms-greenway','Shelby Bottoms Greenway','east-nashville','park'),
 ('adventure-science-center','Adventure Science Center','wedgewood-houston','attraction'),
 ('musicians-hall-of-fame','Musicians Hall of Fame and Museum','downtown','attraction')
)
insert into public.places(slug,name,neighborhood_id,primary_category,status,is_published)
select seed.slug,seed.name,n.id,seed.category,'unverified',false
from seed left join public.neighborhoods n on n.slug=seed.hood
on conflict (slug) do nothing;
