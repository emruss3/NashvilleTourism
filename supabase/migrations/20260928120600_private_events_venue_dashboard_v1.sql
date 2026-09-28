-- Venue dashboard (Phase 2 pulled forward, listing editor first).
--
-- Venue users sign in with a Supabase magic link and see only their venue:
-- membership is by email in event_venue_users, every venue-side policy goes
-- through is_venue_member(). First publish of a venue needs admin approval
-- (approved_at, set with the service role from /admin/events/); after that
-- the venue publishes and unpublishes itself. Packages (instant answers) and
-- the venue-media storage bucket land here too.

-- ---------------------------------------------------------------- members
create table if not exists public.event_venue_users (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.event_venues (id) on delete cascade,
  email citext not null,
  role text not null default 'sales' check (role in ('owner', 'sales')),
  user_id uuid references auth.users (id) on delete set null,
  invited_at timestamptz not null default now(),
  unique (venue_id, email)
);
comment on table public.event_venue_users is 'Who may edit a venue in /venues/. Added by the desk; the user signs in with the same email.';

alter table public.event_venue_users enable row level security;
revoke all on table public.event_venue_users from public, anon, authenticated;
grant select on table public.event_venue_users to authenticated;
grant select, insert, update, delete on table public.event_venue_users to service_role;

create or replace function public.is_venue_member(vid uuid) returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.event_venue_users u
    where u.venue_id = vid
      and (u.user_id = auth.uid() or u.email = (auth.jwt() ->> 'email')::citext)
  );
$$;
revoke all on function public.is_venue_member(uuid) from public, anon;
grant execute on function public.is_venue_member(uuid) to authenticated, service_role;

drop policy if exists event_venue_users_self on public.event_venue_users;
create policy event_venue_users_self on public.event_venue_users for select to authenticated
  using (user_id = auth.uid() or email = (auth.jwt() ->> 'email')::citext);

-- ------------------------------------------------------------- venue fields
alter table public.event_venues
  add column if not exists tour_url text check (tour_url is null or tour_url ~* '^https?://'),
  add column if not exists hours_note text check (hours_note is null or char_length(hours_note) <= 300),
  add column if not exists features text[] not null default '{}',
  add column if not exists publish_requested_at timestamptz,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by text;

comment on column public.event_venues.approved_at is 'Set by the desk from /admin/events/. A venue cannot be published while null; afterwards it publishes itself.';

create or replace function public.event_venue_publish_check() returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.published then
    if concat_ws(' ', new.name, new.summary, new.description, new.address, new.sales_contact_name, new.sales_contact_email, new.hours_note) ~ 'TODO' then
      raise exception 'event_venues: cannot publish % with a TODO placeholder', new.slug;
    end if;
    if new.sales_contact_email is null then
      raise exception 'event_venues: cannot publish % without a sales contact email', new.slug;
    end if;
    if new.approved_at is null then
      raise exception 'event_venues: cannot publish % before the events desk approves it', new.slug;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

-- ----------------------------------------------------------------- packages
create table if not exists public.event_packages (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.event_venues (id) on delete cascade,
  space_id uuid references public.event_spaces (id) on delete set null,
  slug text not null check (slug ~ '^[a-z0-9-]{2,80}$'),
  name text not null check (char_length(name) between 2 and 120),
  summary text check (summary is null or char_length(summary) <= 400),
  for_occasions text[] not null default '{}',
  min_guests integer check (min_guests is null or min_guests >= 1),
  max_guests integer check (max_guests is null or max_guests >= 1),
  price_cents bigint not null check (price_cents > 0),
  price_basis text not null default 'total' check (price_basis in ('total', 'per_person')),
  includes text[] not null default '{}',
  deposit_note text check (deposit_note is null or char_length(deposit_note) <= 300),
  book_url text check (book_url is null or book_url ~* '^https?://'),
  sort_order integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (venue_id, slug),
  check (min_guests is null or max_guests is null or max_guests >= min_guests)
);
comment on table public.event_packages is 'Instant-book packages. The only place "From $X" is shown. book_url is the venue''s own system; no payment here.';

create or replace function public.event_package_publish_check() returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.published then
    if concat_ws(' ', new.name, new.summary, new.deposit_note, array_to_string(new.includes, ' ')) ~ 'TODO' then
      raise exception 'event_packages: cannot publish % with a TODO placeholder', new.slug;
    end if;
    if new.book_url is null then
      raise exception 'event_packages: cannot publish % without a booking link', new.slug;
    end if;
    if new.max_guests is null then
      raise exception 'event_packages: cannot publish % without a maximum group size', new.slug;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists event_packages_publish_check on public.event_packages;
create trigger event_packages_publish_check before insert or update on public.event_packages
  for each row execute function public.event_package_publish_check();

create index if not exists event_packages_venue_published_idx on public.event_packages (venue_id, published);

-- ------------------------------------------------------------------- media
alter table public.event_media
  add column if not exists storage_path text,
  add column if not exists updated_at timestamptz not null default now();

-- ---------------------------------------------------------- venue-side RLS
-- Venues: members read their own venue (contacts included: it is their
-- agreement) and update the fields they own. Commercial terms, ownership,
-- editorial priority, sponsorship and approval stay with the desk.
grant select on table public.event_venues to authenticated;
grant update (name, kind, neighborhood_slug, address, lat, lng, summary, description, website,
  sales_contact_name, sales_contact_email, sales_contact_phone, lead_system, lead_system_endpoint,
  published, publish_requested_at, tour_url, hours_note, features, updated_at)
  on table public.event_venues to authenticated;

drop policy if exists event_venues_member_read on public.event_venues;
create policy event_venues_member_read on public.event_venues for select to authenticated
  using (public.is_venue_member(id));
drop policy if exists event_venues_member_write on public.event_venues;
create policy event_venues_member_write on public.event_venues for update to authenticated
  using (public.is_venue_member(id)) with check (public.is_venue_member(id));

-- Spaces, media, packages: members do everything on rows of their venue.
grant select, insert, update, delete on table public.event_spaces, public.event_media, public.event_packages to authenticated;
grant select on table public.event_packages to anon;
grant select, insert, update, delete on table public.event_packages to service_role;
alter table public.event_packages enable row level security;

drop policy if exists event_spaces_member_all on public.event_spaces;
create policy event_spaces_member_all on public.event_spaces for all to authenticated
  using (public.is_venue_member(venue_id)) with check (public.is_venue_member(venue_id));

drop policy if exists event_media_member_all on public.event_media;
create policy event_media_member_all on public.event_media for all to authenticated
  using (public.is_venue_member(venue_id))
  with check (public.is_venue_member(venue_id) and rights_cleared = true and credit is not null and char_length(credit) > 0);

drop policy if exists event_packages_public_read on public.event_packages;
create policy event_packages_public_read on public.event_packages for select to anon, authenticated
  using (published = true and exists (select 1 from public.event_venues v where v.id = venue_id and v.published));
drop policy if exists event_packages_member_all on public.event_packages;
create policy event_packages_member_all on public.event_packages for all to authenticated
  using (public.is_venue_member(venue_id)) with check (public.is_venue_member(venue_id));

-- ------------------------------------------------------------- public view
drop view if exists public.event_venues_public;
create view public.event_venues_public
  with (security_barrier = true) as
  select id, slug, name, kind, neighborhood_slug, address, lat, lng, summary, description, website,
         owned_by_bph, place_id, sla_hours, featured_until, editorial_priority, tour_url, hours_note, features, created_at, updated_at
  from public.event_venues
  where published = true;
revoke all on public.event_venues_public from public, anon, authenticated;
grant select on public.event_venues_public to anon, authenticated;

-- ------------------------------------------------------------ media bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('venue-media', 'venue-media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Objects live at {venue_id}/{filename}; members write inside their venue's folder, everyone reads.
drop policy if exists venue_media_public_read on storage.objects;
create policy venue_media_public_read on storage.objects for select to public
  using (bucket_id = 'venue-media');
drop policy if exists venue_media_member_write on storage.objects;
create policy venue_media_member_write on storage.objects for insert to authenticated
  with check (bucket_id = 'venue-media' and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$' and public.is_venue_member(((storage.foldername(name))[1])::uuid));
drop policy if exists venue_media_member_update on storage.objects;
create policy venue_media_member_update on storage.objects for update to authenticated
  using (bucket_id = 'venue-media' and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$' and public.is_venue_member(((storage.foldername(name))[1])::uuid));
drop policy if exists venue_media_member_delete on storage.objects;
create policy venue_media_member_delete on storage.objects for delete to authenticated
  using (bucket_id = 'venue-media' and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$' and public.is_venue_member(((storage.foldername(name))[1])::uuid));

-- ------------------------------------------------------------- owned seed
-- The desk's own venues: BPH's events email edits all three. Placeholder
-- until the real sales inbox is known; the desk changes it in the console.
insert into public.event_venue_users (venue_id, email, role)
select v.id, 'TODO-events@example.com', 'owner' from public.event_venues v where v.owned_by_bph
on conflict (venue_id, email) do nothing;
