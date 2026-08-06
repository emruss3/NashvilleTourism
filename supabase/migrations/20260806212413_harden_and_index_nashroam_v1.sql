create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;
grant execute on function public.set_updated_at() to service_role;

create index events_venue_place_idx on public.events(venue_place_id);
create index itinerary_items_place_idx on public.itinerary_items(place_id);
create index itinerary_items_event_idx on public.itinerary_items(event_id);
create index place_source_state_source_idx on public.place_source_state(source_id);
create index planner_context_event_idx on public.planner_context(event_id);
create index planner_context_neighborhood_idx on public.planner_context(neighborhood_id);
create index verification_queue_assigned_to_idx on public.verification_queue(assigned_to);
