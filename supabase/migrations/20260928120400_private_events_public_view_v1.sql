-- Review fix: the anon surface for venues is a view of published rows and
-- public columns only. The base table keeps RLS on with no policy for anon or
-- authenticated (deny by default) and no direct grant, so sales contacts,
-- lead system endpoints, referral terms and fee terms are reachable only
-- through the service role. The view is security definer on purpose: the
-- `published = true` predicate is the guard, and anon has no privilege on
-- the base table at all.

drop view if exists public.event_venues_public;

create view public.event_venues_public
  with (security_barrier = true) as
  select id, slug, name, kind, neighborhood_slug, address, lat, lng, summary, description, website,
         owned_by_bph, place_id, sla_hours, featured_until, editorial_priority, created_at, updated_at
  from public.event_venues
  where published = true;

comment on view public.event_venues_public is 'Anon-readable venues: published rows, public columns. Contacts, lead system, referral terms and fee terms stay on event_venues (service role only).';

revoke all on public.event_venues_public from public, anon, authenticated;
grant select on public.event_venues_public to anon, authenticated;

revoke all on table public.event_venues from public, anon, authenticated;
drop policy if exists event_venues_public_read on public.event_venues;

-- Spaces and media carry no contact or credential columns; their published-only
-- policies stand. Leads and inquiries have no anon or authenticated grant.
revoke all on table public.event_leads, public.event_inquiries from public, anon, authenticated;
