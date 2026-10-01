-- Private events, Phase 2 PR 1 (Migration A of the best-in-class brief):
-- layout capacities per space, venue terms, verification, media kinds and
-- floor labels, and month- or day-level availability per space.
--
-- Nothing here publishes a venue or touches an existing row's values; every
-- column is additive and optional.

-- ------------------------------------------------------ layout capacities
alter table public.event_spaces
  add column if not exists cocktail_capacity  integer check (cocktail_capacity  is null or cocktail_capacity  >= 0),
  add column if not exists banquet_capacity   integer check (banquet_capacity   is null or banquet_capacity   >= 0),
  add column if not exists theater_capacity   integer check (theater_capacity   is null or theater_capacity   >= 0),
  add column if not exists classroom_capacity integer check (classroom_capacity is null or classroom_capacity >= 0),
  add column if not exists boardroom_capacity integer check (boardroom_capacity is null or boardroom_capacity >= 0);

-- ------------------------------------------------------------------ terms
-- All optional plain text, capped. Public on the venue page's Terms tab.
alter table public.event_venues
  add column if not exists deposit_terms      text check (deposit_terms      is null or char_length(deposit_terms)      <= 600),
  add column if not exists cancellation_terms text check (cancellation_terms is null or char_length(cancellation_terms) <= 600),
  add column if not exists gratuity_note      text check (gratuity_note      is null or char_length(gratuity_note)      <= 300),
  add column if not exists minimum_notice     text check (minimum_notice     is null or char_length(minimum_notice)     <= 200),
  add column if not exists outside_catering   text check (outside_catering   is null or char_length(outside_catering)   <= 300),
  add column if not exists noise_curfew       text check (noise_curfew       is null or char_length(noise_curfew)       <= 200),
  add column if not exists insurance_note     text check (insurance_note     is null or char_length(insurance_note)     <= 300),
  add column if not exists parking_note       text check (parking_note       is null or char_length(parking_note)       <= 300),
  add column if not exists transit_note       text check (transit_note       is null or char_length(transit_note)       <= 300),
  -- Set by the desk after a site visit or a call; the public badge shows only when set.
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by text;

-- Members edit their own terms; verification stays with the desk.
grant update (deposit_terms, cancellation_terms, gratuity_note, minimum_notice, outside_catering, noise_curfew, insurance_note, parking_note, transit_note)
  on table public.event_venues to authenticated;

-- ------------------------------------------------------------------ media
alter table public.event_media
  add column if not exists kind text not null default 'photo' check (kind in ('photo', 'floor_plan', 'video', 'menu_pdf', 'tour_poster')),
  add column if not exists floor_label text check (floor_label is null or char_length(floor_label) <= 60);

create index if not exists event_media_venue_kind_idx on public.event_media (venue_id, kind, sort_order);

-- Floor plans and menus may be PDFs.
update storage.buckets
   set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
 where id = 'venue-media';

-- ----------------------------------------------------------- availability
-- Month-level status per space, with an optional date-level override. A row
-- carries exactly one of month (first of the month) or day.
create table if not exists public.event_availability (
  id          uuid primary key default gen_random_uuid(),
  venue_id    uuid not null references public.event_venues (id) on delete cascade,
  space_id    uuid not null references public.event_spaces (id) on delete cascade,
  month       date check (month is null or month = date_trunc('month', month)::date),
  day         date,
  status      text not null check (status in ('open', 'limited', 'booked')),
  note        text check (note is null or char_length(note) <= 200),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check ((month is null) <> (day is null))
);
create unique index if not exists event_availability_space_month_key on public.event_availability (space_id, month) where month is not null;
create unique index if not exists event_availability_space_day_key   on public.event_availability (space_id, day)   where day   is not null;
create index if not exists event_availability_venue_idx on public.event_availability (venue_id, space_id);

-- The space must belong to the venue on the row; keeps member RLS honest.
create or replace function public.event_availability_check() returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if not exists (select 1 from public.event_spaces s where s.id = new.space_id and s.venue_id = new.venue_id) then
    raise exception 'event_availability: space % does not belong to venue %', new.space_id, new.venue_id;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists event_availability_check on public.event_availability;
create trigger event_availability_check before insert or update on public.event_availability
  for each row execute function public.event_availability_check();

alter table public.event_availability enable row level security;
grant select on table public.event_availability to anon, authenticated;
grant select, insert, update, delete on table public.event_availability to authenticated, service_role;

-- Public: rows of published spaces at published venues (the strip on the venue page, the brief's grey-out).
drop policy if exists event_availability_public_read on public.event_availability;
create policy event_availability_public_read on public.event_availability for select to anon, authenticated
  using (
    exists (select 1 from public.event_venues v where v.id = venue_id and v.published)
    and exists (select 1 from public.event_spaces s where s.id = space_id and s.published)
  );
-- Members: everything on their own venue's rows.
drop policy if exists event_availability_member_all on public.event_availability;
create policy event_availability_member_all on public.event_availability for all to authenticated
  using (public.is_venue_member(venue_id)) with check (public.is_venue_member(venue_id));

-- ------------------------------------------------------------- public view
-- Terms and verified_at join the anon surface; verified_by (the desk person)
-- and every contact or commercial column stay off it.
drop view if exists public.event_venues_public;
create view public.event_venues_public
  with (security_barrier = true) as
  select id, slug, name, kind, neighborhood_slug, address, lat, lng, summary, description, website,
         owned_by_bph, place_id, sla_hours, featured_until, editorial_priority, tour_url, hours_note, features,
         deposit_terms, cancellation_terms, gratuity_note, minimum_notice, outside_catering, noise_curfew,
         insurance_note, parking_note, transit_note, verified_at, created_at, updated_at
  from public.event_venues
  where published = true;
revoke all on public.event_venues_public from public, anon, authenticated;
grant select on public.event_venues_public to anon, authenticated;
