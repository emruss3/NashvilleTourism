-- Generic place discovery layer (Overture / FSQ OS / future POI providers).
-- Automation owns identity; humans own publication via approve_place / reject_place.

insert into public.data_sources (
  provider_key, name, source_type, base_url, terms_url,
  attribution_required, attribution_text, default_ttl_minutes,
  can_display_rating, can_display_reviews, can_store_raw, active, notes
) values (
  'overture_maps',
  'Overture Maps Places',
  'places',
  'https://docs.overturemaps.org/',
  'https://docs.overturemaps.org/attribution/',
  true,
  'Overture Maps Foundation Places (multi-license; preserve per-record licenses)',
  10080,
  false,
  false,
  true,
  true,
  'Credential-free primary automated Nashville POI discovery feed. Never auto-publishes or writes nashroam_score.'
)
on conflict (provider_key) do update set
  name = excluded.name,
  source_type = excluded.source_type,
  base_url = excluded.base_url,
  terms_url = excluded.terms_url,
  attribution_required = excluded.attribution_required,
  attribution_text = excluded.attribution_text,
  default_ttl_minutes = excluded.default_ttl_minutes,
  can_store_raw = excluded.can_store_raw,
  active = true,
  notes = excluded.notes,
  updated_at = now();

create table if not exists public.place_discovery_candidates (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.data_sources(id) on delete cascade,
  external_id text not null,
  name text not null,
  basic_category text,
  taxonomy_primary text,
  taxonomy_hierarchy text[] not null default '{}',
  alternate_categories text[] not null default '{}',
  latitude double precision,
  longitude double precision,
  address_line1 text,
  locality text,
  region text,
  postal_code text,
  country_code text not null default 'US',
  phone text,
  website_url text,
  operating_status text,
  provider_confidence numeric,
  source_release text,
  source_licenses jsonb not null default '[]'::jsonb,
  source_metadata jsonb not null default '{}'::jsonb,
  tourism_relevant boolean not null default false,
  suggested_category text,
  candidate_score smallint not null default 0 check (candidate_score between 0 and 100),
  match_status text not null default 'unmatched'
    check (match_status in ('unmatched','matched','ambiguous','auto_created','ignored','closed')),
  match_confidence smallint check (match_confidence is null or match_confidence between 0 and 100),
  match_method text,
  canonical_place_id uuid references public.places(id) on delete set null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_scored_at timestamptz,
  last_matched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint place_discovery_candidates_unique unique (source_id, external_id),
  constraint place_discovery_candidates_lat_check check (latitude is null or latitude between -90 and 90),
  constraint place_discovery_candidates_lng_check check (longitude is null or longitude between -180 and 180)
);

create index if not exists place_discovery_candidates_score_idx
  on public.place_discovery_candidates (tourism_relevant, candidate_score desc, match_status);
create index if not exists place_discovery_candidates_match_idx
  on public.place_discovery_candidates (match_status, suggested_category);
create index if not exists place_discovery_candidates_geo_idx
  on public.place_discovery_candidates (latitude, longitude);
create index if not exists place_discovery_candidates_name_idx
  on public.place_discovery_candidates (lower(name));
create index if not exists place_discovery_candidates_canonical_idx
  on public.place_discovery_candidates (canonical_place_id);
create index if not exists place_discovery_candidates_hierarchy_gin
  on public.place_discovery_candidates using gin (taxonomy_hierarchy);

drop trigger if exists place_discovery_candidates_set_updated_at on public.place_discovery_candidates;
create trigger place_discovery_candidates_set_updated_at
  before update on public.place_discovery_candidates
  for each row execute function public.set_updated_at();

alter table public.place_discovery_candidates enable row level security;
revoke all on public.place_discovery_candidates from anon, authenticated;
grant all on public.place_discovery_candidates to service_role;

create or replace view public.place_discovery_queue
with (security_invoker = true)
as
select
  c.id,
  c.source_id,
  ds.provider_key,
  ds.name as provider_name,
  c.external_id,
  c.name,
  c.basic_category,
  c.taxonomy_primary,
  c.taxonomy_hierarchy,
  c.alternate_categories,
  c.latitude,
  c.longitude,
  c.address_line1,
  c.locality,
  c.region,
  c.postal_code,
  c.country_code,
  c.phone,
  c.website_url,
  c.operating_status,
  c.provider_confidence,
  c.source_release,
  c.source_licenses,
  c.tourism_relevant,
  c.suggested_category,
  c.candidate_score,
  c.match_status,
  c.match_confidence,
  c.match_method,
  c.canonical_place_id,
  p.name as canonical_place_name,
  p.slug as canonical_place_slug,
  p.is_published as canonical_is_published,
  p.curation_status as canonical_curation_status,
  c.first_seen_at,
  c.last_seen_at,
  c.last_scored_at,
  c.last_matched_at,
  c.created_at,
  c.updated_at,
  case
    when lower(coalesce(c.operating_status, '')) in ('permanently_closed', 'closed', 'closed_permanently') then true
    else false
  end as potentially_closed
from public.place_discovery_candidates c
join public.data_sources ds on ds.id = c.source_id
left join public.places p on p.id = c.canonical_place_id;

revoke all on public.place_discovery_queue from anon, authenticated;
grant select on public.place_discovery_queue to service_role;

create or replace function public.score_place_discovery_candidates()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_updated integer := 0;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role required';
  end if;

  update public.place_discovery_candidates c
  set
    tourism_relevant = (
      c.taxonomy_hierarchy && array[
        'food_and_drink','arts_and_entertainment','cultural_and_historic',
        'shopping','sports_and_recreation','lodging'
      ]::text[]
      or coalesce(c.basic_category, '') in (
        'restaurant','cafe','bar','hotel','museum','park','attraction','nightlife'
      )
    ),
    suggested_category = case
      when 'restaurant' = any(c.taxonomy_hierarchy)
        or ( 'food_and_drink' = any(c.taxonomy_hierarchy)
             and coalesce(c.taxonomy_primary, c.basic_category, '') ~* 'restaurant|diner|steakhouse|pizza|sushi|taco|bbq|bakery' )
        then 'restaurant'
      when coalesce(c.taxonomy_primary, c.basic_category, '') ~* 'coffee|cafe|tea'
        or ('food_and_drink' = any(c.taxonomy_hierarchy) and coalesce(c.taxonomy_primary,'') ~* 'coffee|cafe')
        then 'coffee'
      when coalesce(c.taxonomy_primary, c.basic_category, '') ~* 'bar|pub|nightlife|night_club|brewery|wine'
        or 'nightlife' = any(c.taxonomy_hierarchy)
        then 'bar-nightlife'
      when 'lodging' = any(c.taxonomy_hierarchy)
        or coalesce(c.taxonomy_primary, c.basic_category, '') ~* 'hotel|motel|resort|lodging'
        then 'lodging'
      when 'shopping' = any(c.taxonomy_hierarchy)
        then 'shopping'
      when 'sports_and_recreation' = any(c.taxonomy_hierarchy)
        or coalesce(c.taxonomy_primary, c.basic_category, '') ~* 'park|trail|recreation'
        then 'outdoor'
      when 'arts_and_entertainment' = any(c.taxonomy_hierarchy)
        or 'cultural_and_historic' = any(c.taxonomy_hierarchy)
        or coalesce(c.taxonomy_primary, c.basic_category, '') ~* 'museum|theatre|theater|gallery|attraction|landmark|music'
        then 'attraction'
      when 'food_and_drink' = any(c.taxonomy_hierarchy)
        then 'restaurant'
      else null
    end,
    candidate_score = least(100, greatest(0,
      20
      + case when c.name is not null and length(trim(c.name)) >= 2 then 15 else 0 end
      + case when c.latitude is not null and c.longitude is not null then 15 else 0 end
      + case when nullif(trim(c.address_line1), '') is not null then 10 else 0 end
      + case when nullif(trim(c.website_url), '') is not null then 10 else 0 end
      + case when nullif(trim(c.phone), '') is not null then 5 else 0 end
      + case when nullif(trim(c.postal_code), '') is not null then 5 else 0 end
      + case when coalesce(c.locality, '') ~* 'nashville' then 8 else 0 end
      + case
          when lower(coalesce(c.operating_status, '')) in ('open', 'operational', 'open_for_business') then 10
          when lower(coalesce(c.operating_status, '')) in ('permanently_closed', 'closed', 'closed_permanently') then -40
          else 0
        end
      + case
          when c.provider_confidence is null then 0
          when c.provider_confidence >= 0.9 then 12
          when c.provider_confidence >= 0.7 then 8
          when c.provider_confidence >= 0.5 then 4
          else 0
        end
      + case
          when 'restaurant' = any(c.taxonomy_hierarchy) and 'food_and_drink' = any(c.taxonomy_hierarchy) then 10
          when c.taxonomy_hierarchy && array[
            'food_and_drink','arts_and_entertainment','cultural_and_historic',
            'shopping','sports_and_recreation','lodging'
          ]::text[] then 6
          else -20
        end
    ))::smallint,
    last_scored_at = now(),
    updated_at = now();

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

revoke all on function public.score_place_discovery_candidates() from public, anon, authenticated;
grant execute on function public.score_place_discovery_candidates() to service_role;

-- Deterministic match + auto-create unpublished canonical places.
-- Never sets is_published=true or writes place_editorial / nashroam_score.
create or replace function public.match_place_discovery_candidates(
  p_min_score smallint default 70,
  p_auto_create boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_matched integer := 0;
  v_ambiguous integer := 0;
  v_created integer := 0;
  v_closed integer := 0;
  r record;
  v_place_id uuid;
  v_slug text;
  v_hits integer;
  v_method text;
  v_conf smallint;
  v_domain text;
  v_norm_name text;
  v_norm_addr text;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role required';
  end if;

  for r in
    select c.*, ds.provider_key
    from public.place_discovery_candidates c
    join public.data_sources ds on ds.id = c.source_id
    where c.tourism_relevant = true
      and c.match_status in ('unmatched', 'ambiguous')
      and c.candidate_score >= p_min_score
  loop
    if lower(coalesce(r.operating_status, '')) in ('permanently_closed', 'closed', 'closed_permanently') then
      update public.place_discovery_candidates
      set match_status = 'closed', match_method = 'operating_status', match_confidence = 90,
          last_matched_at = now(), updated_at = now()
      where id = r.id;
      insert into public.verification_queue (entity_type, entity_id, reason_code, severity, details)
      values (
        'place', r.canonical_place_id, 'provider_closed', 'high',
        jsonb_build_object('candidate_id', r.id, 'provider', r.provider_key, 'external_id', r.external_id, 'name', r.name)
      );
      v_closed := v_closed + 1;
      continue;
    end if;

    v_place_id := null;
    v_method := null;
    v_conf := null;
    v_hits := 0;
    v_norm_name := lower(regexp_replace(coalesce(r.name, ''), '[^a-z0-9]+', ' ', 'g'));
    v_norm_name := trim(regexp_replace(v_norm_name, '\s+', ' ', 'g'));
    v_norm_addr := lower(regexp_replace(coalesce(r.address_line1, ''), '[^a-z0-9]+', ' ', 'g'));
    v_norm_addr := regexp_replace(v_norm_addr,
      '\y(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|court|ct|suite|ste|unit|#)\y',
      ' ', 'g');
    v_norm_addr := trim(regexp_replace(v_norm_addr, '\s+', ' ', 'g'));
    v_domain := nullif(lower(regexp_replace(
      regexp_replace(coalesce(r.website_url, ''), '^https?://(www\.)?', '', 'i'),
      '/.*$', '', ''
    )), '');

    -- D) existing provider external id
    select psi.place_id into v_place_id
    from public.place_source_ids psi
    where psi.source_id = r.source_id and psi.external_id = r.external_id
    limit 1;
    if v_place_id is not null then
      v_method := 'provider_external_id';
      v_conf := 100;
      v_hits := 1;
    end if;

    -- A) same website domain (unique hit). Prefer name+domain when multiple share a domain.
    if v_place_id is null and v_domain is not null and length(v_domain) >= 4 then
      select count(*), min(p.id) into v_hits, v_place_id
      from public.places p
      where nullif(p.website_url, '') is not null
        and lower(regexp_replace(regexp_replace(p.website_url, '^https?://(www\.)?', '', 'i'), '/.*$', '', '')) = v_domain
        and (
          lower(regexp_replace(regexp_replace(p.name, '[^a-z0-9]+', ' ', 'g'), '\s+', ' ', 'g')) = v_norm_name
          or not exists (
            select 1 from public.places p2
            where nullif(p2.website_url, '') is not null
              and lower(regexp_replace(regexp_replace(p2.website_url, '^https?://(www\.)?', '', 'i'), '/.*$', '', '')) = v_domain
              and p2.id <> p.id
          )
        );
      if v_hits = 1 then
        v_method := 'website_domain';
        v_conf := 95;
      elsif v_hits > 1 then
        v_place_id := null;
        update public.place_discovery_candidates
        set match_status = 'ambiguous', match_method = 'website_domain_multi', match_confidence = 40,
            last_matched_at = now(), updated_at = now()
        where id = r.id;
        insert into public.verification_queue (entity_type, entity_id, reason_code, severity, details)
        values ('place', null, 'ambiguous_place_match', 'medium',
          jsonb_build_object('candidate_id', r.id, 'method', 'website_domain', 'hits', v_hits, 'name', r.name));
        v_ambiguous := v_ambiguous + 1;
        continue;
      end if;
    end if;

    -- B) same normalized name + street/ZIP
    if v_place_id is null and length(v_norm_name) >= 3 and (length(v_norm_addr) >= 5 or nullif(r.postal_code, '') is not null) then
      select count(*), min(p.id) into v_hits, v_place_id
      from public.places p
      where lower(regexp_replace(regexp_replace(p.name, '[^a-z0-9]+', ' ', 'g'), '\s+', ' ', 'g')) = v_norm_name
        and (
          (
            length(v_norm_addr) >= 5
            and trim(regexp_replace(
              regexp_replace(
                lower(regexp_replace(coalesce(p.address_line1,''), '[^a-z0-9]+', ' ', 'g')),
                '\y(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|court|ct|suite|ste|unit|#)\y',
                ' ', 'g'
              ),
              '\s+', ' ', 'g'
            )) = v_norm_addr
          )
          or (
            nullif(r.postal_code,'') is not null and p.postal_code = r.postal_code
            and lower(regexp_replace(regexp_replace(p.name, '[^a-z0-9]+', ' ', 'g'), '\s+', ' ', 'g')) = v_norm_name
          )
        );
      if v_hits = 1 then
        v_method := 'name_address';
        v_conf := 92;
      elsif v_hits > 1 then
        v_place_id := null;
        update public.place_discovery_candidates
        set match_status = 'ambiguous', match_method = 'name_address_multi', match_confidence = 45,
            last_matched_at = now(), updated_at = now()
        where id = r.id;
        insert into public.verification_queue (entity_type, entity_id, reason_code, severity, details)
        values ('place', null, 'ambiguous_place_match', 'medium',
          jsonb_build_object('candidate_id', r.id, 'method', 'name_address', 'hits', v_hits, 'name', r.name));
        v_ambiguous := v_ambiguous + 1;
        continue;
      end if;
    end if;

    -- C) same normalized name + within ~75 meters
    if v_place_id is null and length(v_norm_name) >= 3 and r.latitude is not null and r.longitude is not null then
      select count(*), min(p.id) into v_hits, v_place_id
      from public.places p
      where p.latitude is not null and p.longitude is not null
        and lower(regexp_replace(regexp_replace(p.name, '[^a-z0-9]+', ' ', 'g'), '\s+', ' ', 'g')) = v_norm_name
        and (
          2 * 6371000 * asin(sqrt(
            power(sin(radians((p.latitude - r.latitude) / 2)), 2)
            + cos(radians(r.latitude)) * cos(radians(p.latitude))
              * power(sin(radians((p.longitude - r.longitude) / 2)), 2)
          ))
        ) <= 75;
      if v_hits = 1 then
        v_method := 'name_geodesic_75m';
        v_conf := 90;
      elsif v_hits > 1 then
        v_place_id := null;
        update public.place_discovery_candidates
        set match_status = 'ambiguous', match_method = 'name_geo_multi', match_confidence = 45,
            last_matched_at = now(), updated_at = now()
        where id = r.id;
        insert into public.verification_queue (entity_type, entity_id, reason_code, severity, details)
        values ('place', null, 'ambiguous_place_match', 'medium',
          jsonb_build_object('candidate_id', r.id, 'method', 'name_geodesic_75m', 'hits', v_hits, 'name', r.name));
        v_ambiguous := v_ambiguous + 1;
        continue;
      end if;
    end if;

    if v_place_id is not null then
      update public.place_discovery_candidates
      set match_status = 'matched', match_method = v_method, match_confidence = v_conf,
          canonical_place_id = v_place_id, last_matched_at = now(), updated_at = now()
      where id = r.id;

      -- One external_id per (source, id); one source linkage row per place.
      delete from public.place_source_ids
      where source_id = r.source_id
        and (
          external_id = r.external_id
          or place_id = v_place_id
        )
        and not (place_id = v_place_id and external_id = r.external_id);

      insert into public.place_source_ids (place_id, source_id, external_id, is_primary, last_matched_at, metadata)
      values (
        v_place_id, r.source_id, r.external_id, false, now(),
        jsonb_build_object(
          'match_method', v_method,
          'match_confidence', v_conf,
          'source_release', r.source_release,
          'source_licenses', r.source_licenses,
          'taxonomy_hierarchy', r.taxonomy_hierarchy
        )
      )
      on conflict (source_id, external_id) do update set
        place_id = excluded.place_id,
        last_matched_at = excluded.last_matched_at,
        metadata = excluded.metadata;

      v_matched := v_matched + 1;
      continue;
    end if;

    -- No match: auto-create unpublished canonical identity
    if p_auto_create and r.suggested_category is not null and r.candidate_score >= p_min_score then
      v_slug := 'ovt-' || regexp_replace(lower(r.external_id), '[^a-z0-9]+', '-', 'g');
      v_slug := left(v_slug, 80);

      insert into public.places (
        slug, name, primary_category, address_line1, city, state, postal_code,
        latitude, longitude, phone, website_url, status, is_published, curation_status
      ) values (
        v_slug,
        r.name,
        r.suggested_category,
        r.address_line1,
        coalesce(nullif(r.locality, ''), 'Nashville'),
        coalesce(nullif(r.region, ''), 'TN'),
        r.postal_code,
        r.latitude,
        r.longitude,
        r.phone,
        r.website_url,
        'unverified',
        false,
        'pending'
      )
      on conflict (slug) do update set
        name = excluded.name,
        address_line1 = coalesce(public.places.address_line1, excluded.address_line1),
        latitude = coalesce(public.places.latitude, excluded.latitude),
        longitude = coalesce(public.places.longitude, excluded.longitude),
        phone = coalesce(public.places.phone, excluded.phone),
        website_url = coalesce(public.places.website_url, excluded.website_url),
        updated_at = now()
      returning id into v_place_id;

      delete from public.place_source_ids
      where source_id = r.source_id
        and (
          external_id = r.external_id
          or place_id = v_place_id
        )
        and not (place_id = v_place_id and external_id = r.external_id);

      insert into public.place_source_ids (place_id, source_id, external_id, is_primary, last_matched_at, metadata)
      values (
        v_place_id, r.source_id, r.external_id, true, now(),
        jsonb_build_object(
          'auto_created', true,
          'source_release', r.source_release,
          'source_licenses', r.source_licenses,
          'taxonomy_hierarchy', r.taxonomy_hierarchy,
          'provider_confidence', r.provider_confidence
        )
      )
      on conflict (source_id, external_id) do update set
        place_id = excluded.place_id,
        last_matched_at = now(),
        metadata = excluded.metadata;

      insert into public.place_health (place_id, confidence_score, needs_review, review_reason, last_checked_at)
      values (
        v_place_id,
        least(59, greatest(20, r.candidate_score / 2)),
        true,
        'Auto-created from discovery candidate; awaiting official/human verification before publish',
        now()
      )
      on conflict (place_id) do update set
        needs_review = true,
        review_reason = excluded.review_reason,
        last_checked_at = now(),
        updated_at = now();

      update public.place_discovery_candidates
      set match_status = 'auto_created', match_method = 'auto_create', match_confidence = 80,
          canonical_place_id = v_place_id, last_matched_at = now(), updated_at = now()
      where id = r.id;

      v_created := v_created + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'matched', v_matched,
    'auto_created', v_created,
    'ambiguous', v_ambiguous,
    'closed', v_closed
  );
end;
$$;

revoke all on function public.match_place_discovery_candidates(smallint, boolean) from public, anon, authenticated;
grant execute on function public.match_place_discovery_candidates(smallint, boolean) to service_role;

-- Flag candidates missing from the newest provider release (stale / provider_missing).
create or replace function public.flag_stale_place_discovery_candidates(
  p_source_id uuid,
  p_source_release text,
  p_stale_after interval default interval '14 days'
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_stale integer := 0;
  v_queued integer := 0;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role required';
  end if;

  update public.place_discovery_candidates c
  set
    match_status = case when c.match_status = 'closed' then c.match_status else 'ambiguous' end,
    match_method = 'provider_missing',
    match_confidence = least(coalesce(c.match_confidence, 50), 40),
    updated_at = now()
  where c.source_id = p_source_id
    and c.tourism_relevant = true
    and c.source_release is distinct from p_source_release
    and c.last_seen_at < now() - p_stale_after
    and c.match_status in ('matched', 'auto_created', 'unmatched', 'ambiguous');

  get diagnostics v_stale = row_count;

  insert into public.verification_queue (entity_type, entity_id, reason_code, severity, details)
  select
    'place',
    c.canonical_place_id,
    'provider_missing',
    case when p.is_published then 'high' else 'medium' end,
    jsonb_build_object(
      'candidate_id', c.id,
      'external_id', c.external_id,
      'name', c.name,
      'last_seen_at', c.last_seen_at,
      'source_release', c.source_release,
      'expected_release', p_source_release
    )
  from public.place_discovery_candidates c
  left join public.places p on p.id = c.canonical_place_id
  where c.source_id = p_source_id
    and c.match_method = 'provider_missing'
    and c.last_seen_at < now() - p_stale_after
    and not exists (
      select 1 from public.verification_queue vq
      where vq.reason_code = 'provider_missing'
        and vq.status in ('open', 'in_review')
        and vq.details->>'candidate_id' = c.id::text
    );

  get diagnostics v_queued = row_count;

  return jsonb_build_object('stale_flagged', v_stale, 'verification_queued', v_queued);
end;
$$;

revoke all on function public.flag_stale_place_discovery_candidates(uuid, text, interval) from public, anon, authenticated;
grant execute on function public.flag_stale_place_discovery_candidates(uuid, text, interval) to service_role;
