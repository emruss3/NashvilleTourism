alter table public.planner_context
  add column if not exists rules jsonb not null default '{}'::jsonb;

update public.planner_context set rules = '{"max_block_hours":3,"avoid_return_same_day":true,"preferred_dayparts":["morning","lunch","afternoon"]}'::jsonb where title='12 South is a compact shopping + meal block';
update public.planner_context set rules = '{"avoid_full_day":true,"preferred_dayparts":["afternoon","dinner","evening"]}'::jsonb where title='Broadway is an experience, not the whole itinerary';
update public.planner_context set rules = '{"preferred_dayparts":["evening"],"avoid_early_fixed_commitment_next_day":true}'::jsonb where title='Broadway nightlife works best as a late-day anchor';
update public.planner_context set rules = '{"cluster_same_neighborhood":true}'::jsonb where title in ('Germantown rewards a clustered half-day','East Nashville works best as a neighborhood evening','Wedgewood-Houston is strongest as an arts + food block');
update public.planner_context set rules = '{"pair_with":["downtown-broadway"],"max_block_hours":4}'::jsonb where title='The Gulch pairs naturally with Downtown';
update public.planner_context set rules = '{"preferred_dayparts":["morning","afternoon"],"avoid_late_night":true}'::jsonb where title='West End is a daytime culture + park block';
update public.planner_context set rules = '{"pair_with":["midtown","the-gulch"],"avoid_full_day":true}'::jsonb where title='Music Row should be combined with adjacent districts';
update public.planner_context set rules = '{"fixed_time_anchor":true,"travel_buffer_minutes":45}'::jsonb where title in ('Ryman show: keep pre-show dinner walkable','Bluebird Cafe is a fixed-time anchor');
update public.planner_context set rules = '{"fixed_time_anchor":true,"travel_buffer_minutes":60}'::jsonb where title='Opry / Music Valley needs a travel buffer';
update public.planner_context set rules = '{"high_impact_event":true,"post_event_buffer_minutes":60}'::jsonb where title='Nissan Stadium events change river-crossing logistics';
update public.planner_context set rules = '{"high_impact_event":true,"pre_event_same_neighborhood":true}'::jsonb where title='Bridgestone event: stay Downtown before and after';
update public.planner_context set rules = '{"avoid_late_night":true,"cluster_daytime":true}'::jsonb where title='Family itineraries need fewer late-night transfers';

create index if not exists planner_context_rules_gin_idx
  on public.planner_context using gin(rules);
