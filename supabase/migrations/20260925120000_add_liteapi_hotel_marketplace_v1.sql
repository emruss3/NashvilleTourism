-- LiteAPI (Nuitée) hotel marketplace: provider row, rate and catalog caches,
-- lookup tables, and the weekly catalog refresh. docs/HOTEL-BOOKING.md.
--
-- Provider secrets never live here. The edge function `liteapi-live` reads
-- LITEAPI_SANDBOX_KEY / LITEAPI_PRODUCTION_API_KEY from function secrets and
-- writes these tables with the service role. Public pages read only through
-- the function; anon may read unexpired rate rows directly for future use.

insert into public.data_sources (
  provider_key, name, source_type, base_url, terms_url,
  attribution_required, attribution_text, default_ttl_minutes,
  can_display_rating, can_display_reviews, can_store_raw, active, notes
) values (
  'liteapi',
  'LiteAPI (Nuitée)',
  'other',
  'https://api.liteapi.travel/v3.0',
  'https://www.liteapi.travel/terms',
  true,
  'Hotel names, photos, star ratings, guest ratings and live rates supplied by LiteAPI (Nuitée). Bookings are completed on our booking site and processed by Nuitée Travel Limited.',
  180,
  true,
  false,
  false,
  true,
  'Live rates through liteapi-live only. Never prebook/book from our code. Rating display allowed per LiteAPI hotel-data terms; reviews held back until verified. Catalog is refreshed weekly by coordinates (no cityName search, no /data/places).'
)
on conflict (provider_key) do update set
  name = excluded.name,
  source_type = excluded.source_type,
  base_url = excluded.base_url,
  terms_url = excluded.terms_url,
  attribution_required = excluded.attribution_required,
  attribution_text = excluded.attribution_text,
  default_ttl_minutes = excluded.default_ttl_minutes,
  can_display_rating = excluded.can_display_rating,
  can_display_reviews = excluded.can_display_reviews,
  can_store_raw = excluded.can_store_raw,
  active = excluded.active,
  notes = excluded.notes,
  updated_at = now();

-- The Booking.com Demand scaffold is gone from the repo; retire its provider row.
update public.data_sources
set active = false, notes = coalesce(notes, '') || ' Retired 2026-09-25: replaced by liteapi.', updated_at = now()
where provider_key = 'booking_demand';

-- ---------------------------------------------------------------------------
-- Live rate cache: one row per (area or id set, dates, occupancy).
-- ---------------------------------------------------------------------------
create table if not exists public.hotel_rate_cache (
  id uuid primary key default gen_random_uuid(),
  area_key text not null,
  checkin date not null,
  checkout date not null,
  occupancy_key text not null,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null,
  source_id uuid not null references public.data_sources (id) on delete cascade,
  constraint hotel_rate_cache_dates check (checkout > checkin),
  constraint hotel_rate_cache_unique unique (area_key, checkin, checkout, occupancy_key)
);

comment on table public.hotel_rate_cache is 'Normalized LiteAPI /hotels/rates responses keyed by area or hotel-id set, dates and occupancy. Rows expire per data_sources.default_ttl_minutes. Contains retail totals and SSP only; never net rates or margin.';

create index if not exists hotel_rate_cache_lookup_idx
  on public.hotel_rate_cache (area_key, checkin, checkout, occupancy_key);
create index if not exists hotel_rate_cache_expires_idx on public.hotel_rate_cache (expires_at);

alter table public.hotel_rate_cache enable row level security;
revoke all on table public.hotel_rate_cache from public, anon, authenticated;
grant select on table public.hotel_rate_cache to anon, authenticated;
grant select, insert, update, delete on table public.hotel_rate_cache to service_role;

drop policy if exists hotel_rate_cache_read_unexpired on public.hotel_rate_cache;
create policy hotel_rate_cache_read_unexpired on public.hotel_rate_cache
  for select to anon, authenticated using (expires_at > now());

-- ---------------------------------------------------------------------------
-- Static catalog for Davidson County, refreshed weekly.
-- ---------------------------------------------------------------------------
create table if not exists public.hotel_catalog_cache (
  lite_id text primary key,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  stars numeric(3,1),
  rating numeric(4,2),
  review_count integer,
  hotel_type_id integer,
  chain_id integer,
  facility_ids integer[] not null default '{}',
  thumbnail text,
  address text,
  city text,
  zip text,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null,
  deleted_at timestamptz
);

comment on table public.hotel_catalog_cache is 'LiteAPI /data/hotels rows inside Davidson County bounds, fetched by coordinates and radius. Display on noindex marketplace surfaces only.';

create index if not exists hotel_catalog_cache_geo_idx on public.hotel_catalog_cache (lat, lng);
create index if not exists hotel_catalog_cache_type_idx on public.hotel_catalog_cache (hotel_type_id);

alter table public.hotel_catalog_cache enable row level security;
revoke all on table public.hotel_catalog_cache from public, anon, authenticated;
grant select, insert, update, delete on table public.hotel_catalog_cache to service_role;

create table if not exists public.lookup_liteapi_facilities (
  id integer primary key,
  name text not null,
  fetched_at timestamptz not null default now()
);
create table if not exists public.lookup_liteapi_hotel_types (
  id integer primary key,
  name text not null,
  fetched_at timestamptz not null default now()
);
alter table public.lookup_liteapi_facilities enable row level security;
alter table public.lookup_liteapi_hotel_types enable row level security;
revoke all on table public.lookup_liteapi_facilities, public.lookup_liteapi_hotel_types from public, anon, authenticated;
grant select, insert, update, delete on table public.lookup_liteapi_facilities, public.lookup_liteapi_hotel_types to service_role;

-- ---------------------------------------------------------------------------
-- Weekly catalog refresh. Same cron-token pattern the Viator jobs used: the
-- token lives in Vault as `nashroam_cron_token` and in function secrets as
-- NASHROAM_CRON_TOKEN; the function accepts it for catalog_refresh only.
-- ---------------------------------------------------------------------------
select cron.unschedule(jobid) from cron.job where jobname = 'nashroam-liteapi-catalog';
select cron.schedule(
  'nashroam-liteapi-catalog',
  '20 9 * * 1',
  $$
  select net.http_post(
    url := 'https://aeomrsutkhwmnscvvfur.supabase.co/functions/v1/liteapi-live',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-nashroam-cron-token',(select decrypted_secret from vault.decrypted_secrets where name='nashroam_cron_token')
    ),
    body := '{"mode":"catalog_refresh"}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);

-- Expired rate rows are small but accumulate; sweep nightly.
select cron.unschedule(jobid) from cron.job where jobname = 'nashroam-liteapi-rate-sweep';
select cron.schedule(
  'nashroam-liteapi-rate-sweep',
  '40 8 * * *',
  $$ delete from public.hotel_rate_cache where expires_at < now() - interval '1 day' $$
);
