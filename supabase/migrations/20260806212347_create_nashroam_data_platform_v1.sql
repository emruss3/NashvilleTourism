create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;
grant execute on function public.set_updated_at() to service_role;

create table public.neighborhoods (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  short_description text,
  planner_summary text,
  center_lat double precision,
  center_lng double precision,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint neighborhoods_lat_check check (center_lat is null or center_lat between -90 and 90),
  constraint neighborhoods_lng_check check (center_lng is null or center_lng between -180 and 180)
);

create table public.data_sources (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null unique,
  name text not null,
  source_type text not null,
  base_url text,
  terms_url text,
  attribution_required boolean not null default false,
  attribution_text text,
  default_ttl_minutes integer,
  can_display_rating boolean not null default false,
  can_display_reviews boolean not null default false,
  can_store_raw boolean not null default false,
  active boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint data_sources_type_check check (
    source_type in ('editorial','places','reviews','reservations','tickets','events','official','manual','other')
  ),
  constraint data_sources_ttl_check check (default_ttl_minutes is null or default_ttl_minutes > 0)
);

create table public.places (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  neighborhood_id uuid references public.neighborhoods(id) on delete set null,
  primary_category text not null,
  subcategories text[] not null default '{}',
  cuisine text[] not null default '{}',
  price_level smallint,
  address_line1 text,
  address_line2 text,
  city text not null default 'Nashville',
  state text not null default 'TN',
  postal_code text,
  latitude double precision,
  longitude double precision,
  phone text,
  website_url text,
  reservation_url text,
  status text not null default 'unverified',
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint places_price_level_check check (price_level is null or price_level between 1 and 4),
  constraint places_lat_check check (latitude is null or latitude between -90 and 90),
  constraint places_lng_check check (longitude is null or longitude between -180 and 180),
  constraint places_status_check check (
    status in ('active','temporarily_closed','permanently_closed','coming_soon','unverified')
  )
);

create table public.place_editorial (
  place_id uuid primary key references public.places(id) on delete cascade,
  nashroam_score numeric(5,2),
  editorial_rank integer,
  summary text,
  local_note text,
  vibe text[] not null default '{}',
  best_for text[] not null default '{}',
  traveler_types text[] not null default '{}',
  meal_periods text[] not null default '{}',
  typical_duration_minutes integer,
  tourist_level smallint,
  family_friendly boolean,
  group_friendly boolean,
  live_music boolean,
  rooftop boolean,
  outdoor_space boolean,
  reservation_recommended boolean,
  booking_lead_time_hours integer,
  planner_priority smallint not null default 50,
  avoid_if text[] not null default '{}',
  source_note text,
  last_human_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint place_editorial_score_check check (nashroam_score is null or nashroam_score between 0 and 100),
  constraint place_editorial_rank_check check (editorial_rank is null or editorial_rank > 0),
  constraint place_editorial_duration_check check (typical_duration_minutes is null or typical_duration_minutes > 0),
  constraint place_editorial_tourist_check check (tourist_level is null or tourist_level between 0 and 100),
  constraint place_editorial_priority_check check (planner_priority between 0 and 100),
  constraint place_editorial_lead_check check (booking_lead_time_hours is null or booking_lead_time_hours >= 0)
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  tag_group text,
  is_public boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.place_tags (
  place_id uuid not null references public.places(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  weight smallint not null default 50,
  note text,
  created_at timestamptz not null default now(),
  primary key (place_id, tag_id),
  constraint place_tags_weight_check check (weight between 0 and 100)
);

create table public.place_relationships (
  source_place_id uuid not null references public.places(id) on delete cascade,
  target_place_id uuid not null references public.places(id) on delete cascade,
  relationship_type text not null,
  weight smallint not null default 50,
  note text,
  created_at timestamptz not null default now(),
  primary key (source_place_id, target_place_id, relationship_type),
  constraint place_relationships_not_self check (source_place_id <> target_place_id),
  constraint place_relationships_type_check check (
    relationship_type in ('nearby','pairs_well_with','alternative','pre_dinner','post_dinner','same_experience','avoid_pairing')
  ),
  constraint place_relationships_weight_check check (weight between 0 and 100)
);

create table public.place_source_ids (
  place_id uuid not null references public.places(id) on delete cascade,
  source_id uuid not null references public.data_sources(id) on delete cascade,
  external_id text not null,
  external_url text,
  is_primary boolean not null default false,
  last_matched_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (place_id, source_id),
  unique (source_id, external_id)
);

create table public.place_source_state (
  place_id uuid not null references public.places(id) on delete cascade,
  source_id uuid not null references public.data_sources(id) on delete cascade,
  rating_value numeric(6,2),
  rating_scale numeric(6,2),
  review_count integer,
  price_level text,
  business_status text,
  regular_hours jsonb,
  special_hours jsonb,
  open_now boolean,
  fetched_at timestamptz not null,
  expires_at timestamptz,
  display_allowed boolean not null default false,
  attribution text,
  state_hash text,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (place_id, source_id),
  constraint place_source_state_rating_check check (
    rating_value is null or (rating_value >= 0 and rating_scale is not null and rating_scale > 0 and rating_value <= rating_scale)
  ),
  constraint place_source_state_review_count_check check (review_count is null or review_count >= 0)
);

create table public.place_health (
  place_id uuid primary key references public.places(id) on delete cascade,
  confidence_score smallint not null default 0,
  last_checked_at timestamptz,
  last_human_verified_at timestamptz,
  has_hours_conflict boolean not null default false,
  has_status_conflict boolean not null default false,
  has_location_conflict boolean not null default false,
  needs_review boolean not null default true,
  review_reason text,
  last_good_snapshot_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint place_health_confidence_check check (confidence_score between 0 and 100)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  canonical_key text unique,
  slug text,
  name text not null,
  event_type text not null,
  short_description text,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone text not null default 'America/Chicago',
  all_day boolean not null default false,
  venue_place_id uuid references public.places(id) on delete set null,
  venue_name text,
  neighborhood_id uuid references public.neighborhoods(id) on delete set null,
  address text,
  latitude double precision,
  longitude double precision,
  official_url text,
  ticket_url text,
  affiliate_url text,
  expected_attendance integer,
  impact_level smallint not null default 50,
  planner_priority smallint not null default 50,
  traveler_types text[] not null default '{}',
  status text not null default 'unverified',
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_time_check check (ends_at is null or ends_at >= starts_at),
  constraint events_lat_check check (latitude is null or latitude between -90 and 90),
  constraint events_lng_check check (longitude is null or longitude between -180 and 180),
  constraint events_attendance_check check (expected_attendance is null or expected_attendance >= 0),
  constraint events_impact_check check (impact_level between 0 and 100),
  constraint events_priority_check check (planner_priority between 0 and 100),
  constraint events_status_check check (
    status in ('scheduled','cancelled','postponed','completed','unverified')
  )
);

create table public.event_source_links (
  event_id uuid not null references public.events(id) on delete cascade,
  source_id uuid not null references public.data_sources(id) on delete cascade,
  external_id text not null,
  source_url text,
  fetched_at timestamptz not null,
  expires_at timestamptz,
  display_allowed boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (event_id, source_id),
  unique (source_id, external_id)
);

create table public.planner_context (
  id uuid primary key default gen_random_uuid(),
  context_type text not null,
  title text not null,
  body text,
  planner_instruction text not null,
  neighborhood_id uuid references public.neighborhoods(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  starts_at timestamptz,
  ends_at timestamptz,
  traveler_types text[] not null default '{}',
  priority smallint not null default 50,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint planner_context_type_check check (
    context_type in ('citywide','neighborhood','event','season','logistics','audience','editorial')
  ),
  constraint planner_context_time_check check (ends_at is null or starts_at is null or ends_at >= starts_at),
  constraint planner_context_priority_check check (priority between 0 and 100)
);

create table public.itineraries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  share_token uuid not null default gen_random_uuid() unique,
  title text,
  trip_start_date date not null,
  trip_end_date date not null,
  party_size integer,
  traveler_profile jsonb not null default '{}'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  lodging_name text,
  lodging_address text,
  lodging_latitude double precision,
  lodging_longitude double precision,
  status text not null default 'draft',
  generation_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint itineraries_date_check check (trip_end_date >= trip_start_date),
  constraint itineraries_party_check check (party_size is null or party_size > 0),
  constraint itineraries_lat_check check (lodging_latitude is null or lodging_latitude between -90 and 90),
  constraint itineraries_lng_check check (lodging_longitude is null or lodging_longitude between -180 and 180),
  constraint itineraries_status_check check (status in ('draft','generated','saved','archived'))
);

create table public.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  itinerary_id uuid not null references public.itineraries(id) on delete cascade,
  day_number integer not null,
  sort_order integer not null,
  starts_at timestamptz,
  ends_at timestamptz,
  item_type text not null,
  place_id uuid references public.places(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  title_override text,
  notes text,
  booking_url text,
  booking_status text,
  planner_reason text,
  alternatives jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (itinerary_id, day_number, sort_order),
  constraint itinerary_items_day_check check (day_number > 0),
  constraint itinerary_items_sort_check check (sort_order >= 0),
  constraint itinerary_items_time_check check (ends_at is null or starts_at is null or ends_at >= starts_at),
  constraint itinerary_items_type_check check (
    item_type in ('place','event','meal','travel','note','free_time')
  ),
  constraint itinerary_items_target_check check (not (place_id is not null and event_id is not null))
);

create table public.source_snapshots (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.data_sources(id) on delete cascade,
  entity_type text not null,
  entity_id uuid,
  external_id text,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz,
  payload jsonb,
  content_hash text,
  storage_permitted boolean not null default false,
  purge_after timestamptz,
  created_at timestamptz not null default now(),
  constraint source_snapshots_entity_type_check check (entity_type in ('place','event','neighborhood','other')),
  constraint source_snapshots_payload_check check (storage_permitted or payload is null)
);

create table public.ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.data_sources(id) on delete set null,
  job_type text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'running',
  records_fetched integer not null default 0,
  records_upserted integer not null default 0,
  records_flagged integer not null default 0,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  constraint ingestion_runs_status_check check (status in ('running','succeeded','partial','failed')),
  constraint ingestion_runs_counts_check check (
    records_fetched >= 0 and records_upserted >= 0 and records_flagged >= 0
  )
);

create table public.verification_queue (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid,
  reason_code text not null,
  severity text not null default 'medium',
  details jsonb not null default '{}'::jsonb,
  status text not null default 'open',
  first_detected_at timestamptz not null default now(),
  last_detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  assigned_to uuid references auth.users(id) on delete set null,
  resolution_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint verification_queue_entity_type_check check (entity_type in ('place','event','source','neighborhood','other')),
  constraint verification_queue_severity_check check (severity in ('low','medium','high','critical')),
  constraint verification_queue_status_check check (status in ('open','in_review','resolved','ignored'))
);

create index places_neighborhood_idx on public.places(neighborhood_id);
create index places_status_publish_idx on public.places(status, is_published);
create index places_category_idx on public.places(primary_category);
create index places_subcategories_gin_idx on public.places using gin(subcategories);
create index places_cuisine_gin_idx on public.places using gin(cuisine);
create index place_editorial_score_idx on public.place_editorial(nashroam_score desc nulls last);
create index place_editorial_priority_idx on public.place_editorial(planner_priority desc);
create index place_tags_tag_idx on public.place_tags(tag_id);
create index place_relationships_target_idx on public.place_relationships(target_place_id, relationship_type);
create index place_source_state_expiry_idx on public.place_source_state(expires_at);
create index place_health_review_idx on public.place_health(needs_review, confidence_score);
create index events_starts_idx on public.events(starts_at);
create index events_neighborhood_starts_idx on public.events(neighborhood_id, starts_at);
create index events_status_publish_idx on public.events(status, is_published, starts_at);
create index planner_context_active_idx on public.planner_context(is_active, starts_at, ends_at, priority desc);
create index itineraries_user_date_idx on public.itineraries(user_id, trip_start_date);
create index itinerary_items_itinerary_idx on public.itinerary_items(itinerary_id, day_number, sort_order);
create index source_snapshots_source_fetched_idx on public.source_snapshots(source_id, fetched_at desc);
create index source_snapshots_entity_idx on public.source_snapshots(entity_type, entity_id);
create index ingestion_runs_source_started_idx on public.ingestion_runs(source_id, started_at desc);
create index verification_queue_status_idx on public.verification_queue(status, severity, last_detected_at desc);

create trigger neighborhoods_set_updated_at before update on public.neighborhoods
for each row execute function public.set_updated_at();
create trigger data_sources_set_updated_at before update on public.data_sources
for each row execute function public.set_updated_at();
create trigger places_set_updated_at before update on public.places
for each row execute function public.set_updated_at();
create trigger place_editorial_set_updated_at before update on public.place_editorial
for each row execute function public.set_updated_at();
create trigger tags_set_updated_at before update on public.tags
for each row execute function public.set_updated_at();
create trigger place_source_state_set_updated_at before update on public.place_source_state
for each row execute function public.set_updated_at();
create trigger place_health_set_updated_at before update on public.place_health
for each row execute function public.set_updated_at();
create trigger events_set_updated_at before update on public.events
for each row execute function public.set_updated_at();
create trigger planner_context_set_updated_at before update on public.planner_context
for each row execute function public.set_updated_at();
create trigger itineraries_set_updated_at before update on public.itineraries
for each row execute function public.set_updated_at();
create trigger itinerary_items_set_updated_at before update on public.itinerary_items
for each row execute function public.set_updated_at();
create trigger verification_queue_set_updated_at before update on public.verification_queue
for each row execute function public.set_updated_at();

alter table public.neighborhoods enable row level security;
alter table public.data_sources enable row level security;
alter table public.places enable row level security;
alter table public.place_editorial enable row level security;
alter table public.tags enable row level security;
alter table public.place_tags enable row level security;
alter table public.place_relationships enable row level security;
alter table public.place_source_ids enable row level security;
alter table public.place_source_state enable row level security;
alter table public.place_health enable row level security;
alter table public.events enable row level security;
alter table public.event_source_links enable row level security;
alter table public.planner_context enable row level security;
alter table public.itineraries enable row level security;
alter table public.itinerary_items enable row level security;
alter table public.source_snapshots enable row level security;
alter table public.ingestion_runs enable row level security;
alter table public.verification_queue enable row level security;

revoke all on table
  public.neighborhoods,
  public.data_sources,
  public.places,
  public.place_editorial,
  public.tags,
  public.place_tags,
  public.place_relationships,
  public.place_source_ids,
  public.place_source_state,
  public.place_health,
  public.events,
  public.event_source_links,
  public.planner_context,
  public.itineraries,
  public.itinerary_items,
  public.source_snapshots,
  public.ingestion_runs,
  public.verification_queue
from anon, authenticated;

grant all on table
  public.neighborhoods,
  public.data_sources,
  public.places,
  public.place_editorial,
  public.tags,
  public.place_tags,
  public.place_relationships,
  public.place_source_ids,
  public.place_source_state,
  public.place_health,
  public.events,
  public.event_source_links,
  public.planner_context,
  public.itineraries,
  public.itinerary_items,
  public.source_snapshots,
  public.ingestion_runs,
  public.verification_queue
to service_role;

insert into public.data_sources (
  provider_key, name, source_type, active, attribution_required, can_display_rating, can_display_reviews, can_store_raw, notes
) values
  ('nashroam_editorial', 'Nashroam Editorial', 'editorial', true, false, false, false, true, 'First-party editorial and planner context.'),
  ('manual_verification', 'Manual Verification', 'manual', true, false, false, false, true, 'Human verification of operational facts.'),
  ('official_website', 'Official Website', 'official', true, false, false, false, false, 'Official business or event website. Store only durable facts and URLs unless terms permit more.'),
  ('yelp', 'Yelp', 'reviews', false, true, true, false, false, 'Enable only after API credentials and display/storage terms are confirmed.'),
  ('foursquare', 'Foursquare', 'places', false, true, true, false, false, 'Enable only after API credentials and display/storage terms are confirmed.'),
  ('opentable', 'OpenTable', 'reservations', false, true, false, false, false, 'Reservation availability and deep links; enable after partnership/API approval.'),
  ('ticketmaster', 'Ticketmaster Discovery', 'tickets', false, true, false, false, false, 'Live events and ticket links.'),
  ('seatgeek', 'SeatGeek', 'tickets', false, true, false, false, false, 'Secondary event/ticket coverage and affiliate links.'),
  ('visit_music_city', 'Visit Music City / NCVC', 'events', false, true, false, false, false, 'Use only with a licensed feed or approved partnership; do not scrape editorial copy.');

insert into public.neighborhoods (slug, name, sort_order) values
  ('downtown', 'Downtown', 10),
  ('sobro', 'SoBro', 20),
  ('the-gulch', 'The Gulch', 30),
  ('germantown', 'Germantown', 40),
  ('east-nashville', 'East Nashville', 50),
  ('five-points', 'Five Points', 60),
  ('12-south', '12 South', 70),
  ('wedgewood-houston', 'Wedgewood-Houston', 80),
  ('music-row', 'Music Row', 90),
  ('midtown', 'Midtown', 100),
  ('west-end', 'West End', 110),
  ('hillsboro-village', 'Hillsboro Village', 120),
  ('belmont', 'Belmont', 130),
  ('music-valley', 'Music Valley', 140),
  ('marathon-village', 'Marathon Village', 150),
  ('the-nations', 'The Nations', 160),
  ('sylvan-park', 'Sylvan Park', 170),
  ('green-hills', 'Green Hills', 180);
