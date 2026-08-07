create table public.experience_source_ids (
  experience_id uuid not null references public.experiences(id) on delete cascade,
  source_id uuid not null references public.data_sources(id) on delete cascade,
  external_id text not null,
  external_url text,
  is_primary boolean not null default false,
  last_matched_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (experience_id, source_id),
  unique (source_id, external_id)
);

create table public.experience_source_state (
  experience_id uuid not null references public.experiences(id) on delete cascade,
  source_id uuid not null references public.data_sources(id) on delete cascade,
  external_status text,
  rating_value numeric,
  rating_scale numeric,
  review_count integer,
  from_price numeric,
  currency text,
  duration_min_minutes integer,
  duration_max_minutes integer,
  booking_url text,
  confirmation_type text,
  fetched_at timestamptz not null,
  expires_at timestamptz,
  display_allowed boolean not null default false,
  attribution text,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (experience_id, source_id)
);

create table public.viator_destinations (
  destination_id bigint primary key,
  name text not null,
  destination_type text,
  parent_destination_id bigint,
  lookup_id text,
  destination_url text,
  default_currency_code text,
  time_zone text,
  iata_code text,
  latitude double precision,
  longitude double precision,
  is_nashville boolean not null default false,
  fetched_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ingestion_cursors (
  source_id uuid not null references public.data_sources(id) on delete cascade,
  stream_key text not null,
  cursor_value text,
  last_success_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (source_id, stream_key)
);

alter table public.experience_source_ids enable row level security;
alter table public.experience_source_state enable row level security;
alter table public.viator_destinations enable row level security;
alter table public.ingestion_cursors enable row level security;

create index experience_source_ids_external_idx on public.experience_source_ids(source_id, external_id);
create index experience_source_state_expiry_idx on public.experience_source_state(expires_at);
create index viator_destinations_name_idx on public.viator_destinations(lower(name));
create index viator_destinations_parent_idx on public.viator_destinations(parent_destination_id);

create trigger experience_source_state_set_updated_at
before update on public.experience_source_state
for each row execute function public.set_updated_at();

create trigger viator_destinations_set_updated_at
before update on public.viator_destinations
for each row execute function public.set_updated_at();

create trigger ingestion_cursors_set_updated_at
before update on public.ingestion_cursors
for each row execute function public.set_updated_at();
