create table public.fsq_os_categories (
  category_id text primary key,
  category_level smallint,
  category_name text,
  category_label text,
  level1_category_id text,
  level1_category_name text,
  level2_category_id text,
  level2_category_name text,
  level3_category_id text,
  level3_category_name text,
  level4_category_id text,
  level4_category_name text,
  level5_category_id text,
  level5_category_name text,
  level6_category_id text,
  level6_category_name text,
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.fsq_os_place_candidates (
  fsq_place_id text primary key,
  name text not null,
  latitude double precision,
  longitude double precision,
  address text,
  locality text,
  region text,
  postcode text,
  country text,
  date_created date,
  date_refreshed date,
  date_closed date,
  tel text,
  website text,
  email text,
  facebook_id text,
  instagram text,
  twitter text,
  category_ids text[] not null default '{}',
  category_labels text[] not null default '{}',
  placemaker_url text,
  unresolved_flags text[] not null default '{}',
  candidate_status text not null default 'pending' check (candidate_status in ('pending','promoted','ignored','needs_review')),
  canonical_place_id uuid references public.places(id) on delete set null,
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fsq_os_candidate_lat_check check (latitude is null or latitude between -90 and 90),
  constraint fsq_os_candidate_lng_check check (longitude is null or longitude between -180 and 180)
);

create index fsq_os_candidate_status_idx on public.fsq_os_place_candidates(candidate_status, date_refreshed desc nulls last);
create index fsq_os_candidate_location_idx on public.fsq_os_place_candidates(latitude, longitude);
create index fsq_os_candidate_categories_gin_idx on public.fsq_os_place_candidates using gin(category_labels);
create index fsq_os_candidate_flags_gin_idx on public.fsq_os_place_candidates using gin(unresolved_flags);
create index fsq_os_categories_level2_idx on public.fsq_os_categories(level2_category_id, category_name);

create trigger fsq_os_categories_set_updated_at before update on public.fsq_os_categories
for each row execute function public.set_updated_at();
create trigger fsq_os_place_candidates_set_updated_at before update on public.fsq_os_place_candidates
for each row execute function public.set_updated_at();

alter table public.fsq_os_categories enable row level security;
alter table public.fsq_os_place_candidates enable row level security;
revoke all on public.fsq_os_categories, public.fsq_os_place_candidates from anon, authenticated;
grant all on public.fsq_os_categories, public.fsq_os_place_candidates to service_role;

create or replace view public.fsq_os_place_candidate_queue
with (security_invoker = true)
as
with scored as (
  select
    c.*,
    lower(array_to_string(c.category_labels, ' | ')) as category_text,
    array_remove(array[
      case when lower(array_to_string(c.category_labels, ' | ')) ~ '(restaurant|food|diner|steakhouse|pizzeria|sandwich|seafood|sushi|taco|bakery)' then 'restaurant' end,
      case when lower(array_to_string(c.category_labels, ' | ')) ~ '(bar|pub|cocktail|brewery|wine bar|night club|nightclub|beer garden)' then 'bar-nightlife' end,
      case when lower(array_to_string(c.category_labels, ' | ')) ~ '(coffee|cafe|tea room)' then 'coffee' end,
      case when lower(array_to_string(c.category_labels, ' | ')) ~ '(museum|historic|monument|landmark|art gallery|performing arts|theater|theatre|aquarium|zoo|attraction)' then 'attraction' end,
      case when lower(array_to_string(c.category_labels, ' | ')) ~ '(music venue|concert hall|rock club|jazz club|country dance club)' then 'live-music' end,
      case when lower(array_to_string(c.category_labels, ' | ')) ~ '(park|garden|trail|outdoor|recreation|nature preserve)' then 'outdoor' end,
      case when lower(array_to_string(c.category_labels, ' | ')) ~ '(store|shop|boutique|shopping mall|shopping plaza|market)' then 'shopping' end,
      case when lower(array_to_string(c.category_labels, ' | ')) ~ '(hotel|motel|resort|bed and breakfast)' then 'lodging' end
    ]::text[], null) as suggested_types,
    least(100, greatest(0,
      35
      + case when c.date_closed is null then 15 else -50 end
      + case when coalesce(array_length(c.unresolved_flags, 1),0) = 0 then 15 else -15 end
      + case when c.website is not null and c.website <> '' then 8 else 0 end
      + case when c.tel is not null and c.tel <> '' then 4 else 0 end
      + case when c.latitude is not null and c.longitude is not null then 5 else 0 end
      + case when c.date_refreshed >= current_date - 180 then 12 when c.date_refreshed >= current_date - 365 then 6 else 0 end
      + case when c.locality ilike 'Nashville' then 6 else 0 end
    ))::smallint as data_quality_score
  from public.fsq_os_place_candidates c
)
select
  s.*,
  case
    when s.unresolved_flags && array['closed','duplicate','delete','privatevenue','inappropriate','doesnt_exist']::text[] then true
    else false
  end as has_blocking_flag
from scored s;

revoke all on public.fsq_os_place_candidate_queue from anon, authenticated;
grant select on public.fsq_os_place_candidate_queue to service_role;

create or replace function public.promote_fsq_os_candidate(
  p_fsq_place_id text,
  p_primary_category text,
  p_neighborhood_id uuid default null,
  p_existing_place_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_candidate public.fsq_os_place_candidates%rowtype;
  v_source_id uuid;
  v_place_id uuid;
  v_slug text;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role required';
  end if;

  select * into v_candidate
  from public.fsq_os_place_candidates
  where fsq_place_id = p_fsq_place_id
  for update;

  if not found then raise exception 'FSQ candidate not found'; end if;
  if v_candidate.unresolved_flags && array['closed','duplicate','delete','privatevenue','inappropriate','doesnt_exist']::text[] then
    raise exception 'Candidate has blocking unresolved flags';
  end if;

  select id into v_source_id from public.data_sources where provider_key = 'foursquare_os';
  if v_source_id is null then raise exception 'foursquare_os source missing'; end if;

  v_place_id := p_existing_place_id;
  if v_place_id is null then
    v_slug := 'fsq-' || regexp_replace(lower(v_candidate.fsq_place_id), '[^a-z0-9]+', '-', 'g');
    insert into public.places (
      slug, name, neighborhood_id, primary_category, address_line1, city, state, postal_code,
      latitude, longitude, phone, website_url, status, is_published
    ) values (
      v_slug, v_candidate.name, p_neighborhood_id, p_primary_category, v_candidate.address,
      coalesce(v_candidate.locality, 'Nashville'), coalesce(v_candidate.region, 'TN'), v_candidate.postcode,
      v_candidate.latitude, v_candidate.longitude, v_candidate.tel, v_candidate.website,
      'unverified', false
    )
    on conflict (slug) do update set
      name = excluded.name,
      address_line1 = coalesce(public.places.address_line1, excluded.address_line1),
      city = coalesce(public.places.city, excluded.city),
      state = coalesce(public.places.state, excluded.state),
      postal_code = coalesce(public.places.postal_code, excluded.postal_code),
      latitude = coalesce(public.places.latitude, excluded.latitude),
      longitude = coalesce(public.places.longitude, excluded.longitude),
      phone = coalesce(public.places.phone, excluded.phone),
      website_url = coalesce(public.places.website_url, excluded.website_url),
      updated_at = now()
    returning id into v_place_id;
  end if;

  insert into public.place_source_ids (
    place_id, source_id, external_id, external_url, is_primary, last_matched_at, metadata
  ) values (
    v_place_id, v_source_id, v_candidate.fsq_place_id, v_candidate.placemaker_url, true, now(),
    jsonb_build_object(
      'category_ids', v_candidate.category_ids,
      'category_labels', v_candidate.category_labels,
      'date_refreshed', v_candidate.date_refreshed,
      'instagram', v_candidate.instagram,
      'email', v_candidate.email
    )
  )
  on conflict (place_id, source_id) do update set
    external_id = excluded.external_id,
    external_url = excluded.external_url,
    is_primary = excluded.is_primary,
    last_matched_at = excluded.last_matched_at,
    metadata = excluded.metadata;

  insert into public.place_source_state (
    place_id, source_id, business_status, fetched_at, expires_at,
    display_allowed, attribution, metadata
  ) values (
    v_place_id, v_source_id,
    case when v_candidate.date_closed is null then 'open_unverified' else 'closed' end,
    now(), now() + interval '35 days', true, 'Foursquare OS Places',
    jsonb_build_object(
      'date_created', v_candidate.date_created,
      'date_refreshed', v_candidate.date_refreshed,
      'date_closed', v_candidate.date_closed,
      'unresolved_flags', v_candidate.unresolved_flags
    )
  )
  on conflict (place_id, source_id) do update set
    business_status = excluded.business_status,
    fetched_at = excluded.fetched_at,
    expires_at = excluded.expires_at,
    display_allowed = excluded.display_allowed,
    attribution = excluded.attribution,
    metadata = excluded.metadata,
    updated_at = now();

  update public.fsq_os_place_candidates
  set candidate_status = 'promoted', canonical_place_id = v_place_id, updated_at = now()
  where fsq_place_id = p_fsq_place_id;

  return v_place_id;
end;
$$;

create or replace function public.ignore_fsq_os_candidate(
  p_fsq_place_id text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role required';
  end if;
  update public.fsq_os_place_candidates
  set candidate_status = 'ignored', updated_at = now()
  where fsq_place_id = p_fsq_place_id;
end;
$$;

revoke all on function public.promote_fsq_os_candidate(text,text,uuid,uuid) from public, anon, authenticated;
grant execute on function public.promote_fsq_os_candidate(text,text,uuid,uuid) to service_role;
revoke all on function public.ignore_fsq_os_candidate(text) from public, anon, authenticated;
grant execute on function public.ignore_fsq_os_candidate(text) to service_role;
