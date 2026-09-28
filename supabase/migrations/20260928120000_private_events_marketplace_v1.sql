-- Private events referral marketplace, Phase 1 (docs/private-events-marketplace-build-brief.md).
-- Venues and their bookable spaces, media, one lead per venue per inquiry,
-- key dates, and the extended inquiry table. Every table has RLS on: anon
-- may read published listing rows only; everything else is service role.
-- Nothing here touches payments; the venue's own systems do that.

-- ---------------------------------------------------------------------------
-- Venues
-- ---------------------------------------------------------------------------
create table if not exists public.event_venues (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,80}$'),
  name text not null check (char_length(name) between 2 and 120),
  kind text not null check (kind in ('bar', 'restaurant', 'music_venue', 'rooftop', 'hotel', 'event_space', 'other')),
  -- Content neighborhood slug (src/lib/content/neighborhoods.ts), not the places neighborhoods table.
  neighborhood_slug text not null check (neighborhood_slug in (
    'downtown-broadway', '12-south', 'the-gulch', 'east-nashville', 'germantown', 'wedgewood-houston',
    'midtown', 'hillsboro-village', 'sylvan-park', 'green-hills', 'music-valley-opryland'
  )),
  address text not null check (char_length(address) <= 200),
  lat double precision check (lat is null or (lat between -90 and 90)),
  lng double precision check (lng is null or (lng between -180 and 180)),
  summary text not null check (char_length(summary) <= 300),
  description text,
  website text check (website is null or website ~* '^https?://'),
  owned_by_bph boolean not null default false,
  place_id uuid references public.places (id) on delete set null,
  sales_contact_name text,
  sales_contact_email text check (sales_contact_email is null or (position('@' in sales_contact_email) > 1 and char_length(sales_contact_email) <= 254)),
  sales_contact_phone text check (sales_contact_phone is null or char_length(sales_contact_phone) <= 40),
  lead_system text not null default 'email' check (lead_system in ('email', 'tripleseat', 'perfect_venue', 'other')),
  lead_system_endpoint text,
  referral_terms_signed_at date,
  fee_pct numeric(4,2) not null default 5.0 check (fee_pct >= 0 and fee_pct <= 20),
  sla_hours integer not null default 24 check (sla_hours between 1 and 168),
  published boolean not null default false,
  featured_until date,
  editorial_priority integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.event_venues is 'Venues in the private events referral marketplace. Same 5% terms for every venue including BPH-owned ones; ownership never affects ranking.';

-- ---------------------------------------------------------------------------
-- Spaces: the bookable unit. Publish check lives in a trigger below.
-- ---------------------------------------------------------------------------
create table if not exists public.event_spaces (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.event_venues (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9-]{2,80}$'),
  name text not null check (char_length(name) between 2 and 120),
  summary text check (char_length(summary) <= 400),
  seated_capacity integer not null default 0 check (seated_capacity >= 0),
  standing_capacity integer not null default 0 check (standing_capacity >= 0),
  min_guests integer check (min_guests is null or min_guests >= 1),
  pricing_model text not null check (pricing_model in ('room_fee', 'min_spend', 'per_person', 'buyout')),
  min_spend_cents bigint check (min_spend_cents is null or min_spend_cents >= 0),
  room_fee_cents bigint check (room_fee_cents is null or room_fee_cents >= 0),
  per_person_cents integer check (per_person_cents is null or per_person_cents >= 0),
  buyout_from_cents bigint check (buyout_from_cents is null or buyout_from_cents >= 0),
  fb_minimum_cents bigint check (fb_minimum_cents is null or fb_minimum_cents >= 0),
  pricing_note text check (pricing_note is null or char_length(pricing_note) <= 300),
  av_included boolean not null default false,
  av_note text,
  outdoor boolean not null default false,
  accessible boolean not null default false,
  private_entrance boolean not null default false,
  hours_note text,
  blackout_note text,
  sort_order integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (venue_id, slug)
);

comment on table public.event_spaces is 'Bookable spaces. A space cannot be published without both capacities, a price field, and no TODO placeholder anywhere in its text.';

-- The publish check: capacities, a price, and no placeholder text.
create or replace function public.event_space_publish_check() returns trigger
language plpgsql as $$
declare
  venue_ok boolean;
begin
  if new.published then
    if coalesce(new.seated_capacity, 0) <= 0 or coalesce(new.standing_capacity, 0) <= 0 then
      raise exception 'event_spaces: cannot publish % without seated and standing capacity', new.slug;
    end if;
    if coalesce(new.min_spend_cents, new.room_fee_cents, new.per_person_cents::bigint, new.buyout_from_cents) is null then
      raise exception 'event_spaces: cannot publish % without a price field', new.slug;
    end if;
    if concat_ws(' ', new.name, new.summary, new.pricing_note, new.av_note, new.hours_note, new.blackout_note) ~ 'TODO' then
      raise exception 'event_spaces: cannot publish % with a TODO placeholder', new.slug;
    end if;
    select (concat_ws(' ', v.name, v.summary, v.description, v.address, v.sales_contact_name, v.sales_contact_email) !~ 'TODO')
      into venue_ok from public.event_venues v where v.id = new.venue_id;
    if not coalesce(venue_ok, false) then
      raise exception 'event_spaces: cannot publish % while its venue still holds a TODO placeholder', new.slug;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists event_spaces_publish_check on public.event_spaces;
create trigger event_spaces_publish_check
  before insert or update on public.event_spaces
  for each row execute function public.event_space_publish_check();

-- A venue cannot be published with TODO text or without a sales contact.
create or replace function public.event_venue_publish_check() returns trigger
language plpgsql as $$
begin
  if new.published then
    if concat_ws(' ', new.name, new.summary, new.description, new.address, new.sales_contact_name, new.sales_contact_email) ~ 'TODO' then
      raise exception 'event_venues: cannot publish % with a TODO placeholder', new.slug;
    end if;
    if new.sales_contact_email is null then
      raise exception 'event_venues: cannot publish % without a sales contact email', new.slug;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists event_venues_publish_check on public.event_venues;
create trigger event_venues_publish_check
  before insert or update on public.event_venues
  for each row execute function public.event_venue_publish_check();

-- ---------------------------------------------------------------------------
-- Media and key dates
-- ---------------------------------------------------------------------------
create table if not exists public.event_media (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.event_venues (id) on delete cascade,
  space_id uuid references public.event_spaces (id) on delete set null,
  url text not null check (url ~* '^(https?://|/)'),
  alt text not null default '' check (char_length(alt) <= 300),
  credit text check (credit is null or char_length(credit) <= 200),
  rights_cleared boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.event_media is 'Venue and space photos. Only rights_cleared rows render.';

create table if not exists public.event_key_dates (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  label text not null check (char_length(label) <= 120),
  kind text not null default 'event' check (kind in ('festival', 'game', 'convention', 'holiday', 'event')),
  source text,
  unique (date, label)
);

comment on table public.event_key_dates is 'Big dates for the availability strip. Maintained as content, not scraped.';

-- ---------------------------------------------------------------------------
-- Inquiries: extend the existing table, never recreate it.
-- ---------------------------------------------------------------------------
alter table public.event_inquiries
  add column if not exists reference text unique,
  add column if not exists occasion text,
  add column if not exists neighborhood_pref text[] not null default '{}',
  add column if not exists needs text[] not null default '{}',
  add column if not exists start_time_band text,
  add column if not exists shortlist_venue_ids uuid[] not null default '{}',
  add column if not exists routed_at timestamptz,
  add column if not exists booked_value_cents bigint check (booked_value_cents is null or booked_value_cents >= 0),
  add column if not exists booked_venue_id uuid references public.event_venues (id) on delete set null,
  add column if not exists fee_due_cents bigint,
  add column if not exists planner_org text check (planner_org is null or char_length(planner_org) <= 160),
  add column if not exists planner_phone text check (planner_phone is null or char_length(planner_phone) <= 40),
  add column if not exists how_heard text check (how_heard is null or char_length(how_heard) <= 120),
  add column if not exists utm jsonb,
  add column if not exists client_reference text check (client_reference is null or char_length(client_reference) <= 80),
  add column if not exists updated_at timestamptz not null default now();

alter table public.event_inquiries drop constraint if exists event_inquiries_occasion_check;
alter table public.event_inquiries add constraint event_inquiries_occasion_check
  check (occasion is null or occasion in ('corporate', 'holiday', 'convention', 'celebration', 'bachelorette', 'rehearsal_dinner', 'welcome_party', 'other'));

-- Widen the status set; the old values stay valid so existing rows and code keep working.
alter table public.event_inquiries drop constraint if exists event_inquiries_status_check;
alter table public.event_inquiries add constraint event_inquiries_status_check
  check (status in ('new', 'contacted', 'qualified', 'closed', 'spam', 'routed', 'replied', 'proposal', 'booked', 'lost'));

-- Fee due = max(booked value x the booked venue's fee_pct, $250). Kept by trigger because fee_pct lives on the venue.
create or replace function public.event_inquiry_fee_due() returns trigger
language plpgsql as $$
declare
  pct numeric;
begin
  if new.booked_value_cents is not null and new.booked_venue_id is not null then
    select fee_pct into pct from public.event_venues where id = new.booked_venue_id;
    new.fee_due_cents := greatest(round(new.booked_value_cents * coalesce(pct, 5.0) / 100.0)::bigint, 25000);
  else
    new.fee_due_cents := null;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists event_inquiries_fee_due on public.event_inquiries;
create trigger event_inquiries_fee_due
  before insert or update on public.event_inquiries
  for each row execute function public.event_inquiry_fee_due();

-- ---------------------------------------------------------------------------
-- Leads: one row per venue per inquiry. The marketplace's core object.
-- ---------------------------------------------------------------------------
create table if not exists public.event_leads (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.event_inquiries (id) on delete cascade,
  venue_id uuid not null references public.event_venues (id) on delete cascade,
  space_id uuid references public.event_spaces (id) on delete set null,
  status text not null default 'routed' check (status in ('new', 'routed', 'replied', 'proposal', 'booked', 'lost', 'spam')),
  routed_at timestamptz not null default now(),
  first_reply_at timestamptz,
  sla_deadline_at timestamptz not null,
  sla_met boolean,
  proposal_at timestamptz,
  outcome_at timestamptz,
  outcome_value_cents bigint check (outcome_value_cents is null or outcome_value_cents >= 0),
  venue_notes text check (venue_notes is null or char_length(venue_notes) <= 4000),
  lost_reason text check (lost_reason is null or char_length(lost_reason) <= 300),
  notify_log jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (inquiry_id, venue_id)
);

comment on table public.event_leads is 'One lead per venue per inquiry. sla_deadline_at is routed_at plus the venue''s sla_hours in Nashville business hours. notify_log records every send attempt.';

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists event_venues_published_idx on public.event_venues (published, neighborhood_slug);
create index if not exists event_spaces_venue_published_idx on public.event_spaces (venue_id, published);
create index if not exists event_media_venue_idx on public.event_media (venue_id, sort_order);
create index if not exists event_leads_venue_status_idx on public.event_leads (venue_id, status);
create index if not exists event_leads_inquiry_idx on public.event_leads (inquiry_id);
create index if not exists event_leads_sla_open_idx on public.event_leads (sla_deadline_at) where first_reply_at is null;
create index if not exists event_key_dates_date_idx on public.event_key_dates (date);

-- ---------------------------------------------------------------------------
-- RLS: anon reads published listing rows only; everything else is service role.
-- ---------------------------------------------------------------------------
alter table public.event_venues enable row level security;
alter table public.event_spaces enable row level security;
alter table public.event_media enable row level security;
alter table public.event_key_dates enable row level security;
alter table public.event_leads enable row level security;

revoke all on table public.event_venues, public.event_spaces, public.event_media, public.event_key_dates, public.event_leads from public, anon, authenticated;
grant select on table public.event_venues, public.event_spaces, public.event_media, public.event_key_dates to anon, authenticated;
grant select, insert, update, delete on table public.event_venues, public.event_spaces, public.event_media, public.event_key_dates, public.event_leads to service_role;

drop policy if exists event_venues_public_read on public.event_venues;
create policy event_venues_public_read on public.event_venues for select to anon, authenticated using (published = true);

drop policy if exists event_spaces_public_read on public.event_spaces;
create policy event_spaces_public_read on public.event_spaces for select to anon, authenticated
  using (published = true and exists (select 1 from public.event_venues v where v.id = venue_id and v.published));

drop policy if exists event_media_public_read on public.event_media;
create policy event_media_public_read on public.event_media for select to anon, authenticated
  using (rights_cleared = true and exists (select 1 from public.event_venues v where v.id = venue_id and v.published));

drop policy if exists event_key_dates_public_read on public.event_key_dates;
create policy event_key_dates_public_read on public.event_key_dates for select to anon, authenticated using (true);

-- Sales contacts must never reach the public read path: a view without them for anon.
create or replace view public.event_venues_public
  with (security_invoker = true) as
  select id, slug, name, kind, neighborhood_slug, address, lat, lng, summary, description, website,
         owned_by_bph, place_id, lead_system, fee_pct, sla_hours, published, featured_until, editorial_priority, created_at, updated_at
  from public.event_venues;
grant select on public.event_venues_public to anon, authenticated;
revoke select on table public.event_venues from anon, authenticated;
