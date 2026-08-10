create or replace function public.link_event_known_venue()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_place_id uuid;
  v_neighborhood_id uuid;
begin
  if new.venue_name is null or trim(new.venue_name) = '' then
    return new;
  end if;

  select p.id, p.neighborhood_id
  into v_place_id, v_neighborhood_id
  from public.places p
  where p.primary_category = 'venue'
    and regexp_replace(lower(p.name), '[^a-z0-9]+', '', 'g') = regexp_replace(lower(new.venue_name), '[^a-z0-9]+', '', 'g')
  order by p.is_published desc, p.updated_at desc
  limit 1;

  if v_place_id is not null then
    new.venue_place_id := coalesce(new.venue_place_id, v_place_id);
    new.neighborhood_id := coalesce(new.neighborhood_id, v_neighborhood_id);
  end if;
  return new;
end;
$$;

revoke all on function public.link_event_known_venue() from public, anon, authenticated;
grant execute on function public.link_event_known_venue() to service_role;

drop trigger if exists events_link_known_venue on public.events;
create trigger events_link_known_venue
before insert or update of venue_name on public.events
for each row execute function public.link_event_known_venue();
