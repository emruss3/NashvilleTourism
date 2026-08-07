create table public.experiences (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  neighborhood_id uuid references public.neighborhoods(id) on delete set null,
  experience_type text not null default 'tour',
  categories text[] not null default '{}',
  summary text,
  duration_min_minutes integer check (duration_min_minutes is null or duration_min_minutes >= 0),
  duration_max_minutes integer check (duration_max_minutes is null or duration_max_minutes >= 0),
  latitude double precision,
  longitude double precision,
  status text not null default 'unverified' check (status in ('unverified','active','inactive','archived')),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (duration_max_minutes is null or duration_min_minutes is null or duration_max_minutes >= duration_min_minutes)
);

create table public.experience_editorial (
  experience_id uuid primary key references public.experiences(id) on delete cascade,
  nashroam_score numeric(5,2) check (nashroam_score is null or nashroam_score between 0 and 100),
  editorial_rank integer,
  local_note text,
  best_for text[] not null default '{}',
  traveler_types text[] not null default '{}',
  planner_priority integer not null default 50 check (planner_priority between 0 and 100),
  human_verified_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.experiences enable row level security;
alter table public.experience_editorial enable row level security;

create index experiences_neighborhood_idx on public.experiences(neighborhood_id);
create index experiences_publish_idx on public.experiences(status, is_published);
create index experiences_categories_gin_idx on public.experiences using gin(categories);
create index experience_editorial_score_idx on public.experience_editorial(nashroam_score desc nulls last);

create trigger experiences_set_updated_at
before update on public.experiences
for each row execute function public.set_updated_at();

create trigger experience_editorial_set_updated_at
before update on public.experience_editorial
for each row execute function public.set_updated_at();
