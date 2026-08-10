insert into public.planner_context (
  context_type,title,body,planner_instruction,neighborhood_id,traveler_types,priority,is_active
)
select 'neighborhood','12 South is a compact shopping + meal block',
  'Treat 12 South as a focused shopping, coffee and meal stop rather than an entire sightseeing day.',
  'When 12 South is selected, normally allocate about 2–3 hours and pair shopping with lunch/brunch or Sevier Park time. Avoid sending the traveler away and back to 12 South again the same day.',
  n.id,array['first-visit','couples','friends','food'],85,true
from public.neighborhoods n where n.slug='12-south'
union all
select 'neighborhood','Broadway is an experience, not the whole itinerary',
  'First-time visitors usually want Lower Broadway, but Nashroam should not automatically spend a full day there.',
  'For first-time visitors, include a meaningful Broadway block but balance it with another Nashville neighborhood or attraction. Prefer Broadway in the late afternoon/evening unless the traveler explicitly wants an all-day honky-tonk trip.',
  n.id,array['first-visit','friends','bachelor','bachelorette'],90,true
from public.neighborhoods n where n.slug='downtown'
union all
select 'audience','Broadway nightlife works best as a late-day anchor',
  'Group trips often want Broadway nightlife, but dinner, tickets and daytime neighborhoods should be planned before the party block.',
  'For nightlife-heavy groups, schedule a real daytime neighborhood and dinner first, then make Broadway the late-day anchor. Do not schedule fixed morning obligations immediately after a very late Broadway night unless the traveler requests a packed pace.',
  n.id,array['friends','bachelor','bachelorette'],80,true
from public.neighborhoods n where n.slug='downtown'
union all
select 'logistics','Ryman show: keep pre-show dinner walkable',
  'A Ryman ticket should simplify the evening rather than cause an unnecessary cross-city move.',
  'When the itinerary contains a Ryman Auditorium show, prioritize a Downtown/SoBro dinner beforehand and preserve enough walking/security buffer. Avoid sending the traveler to a distant neighborhood immediately before showtime.',
  n.id,array['first-visit','couples','music','friends'],95,true
from public.neighborhoods n where n.slug='downtown'
union all
select 'logistics','Bluebird Cafe is a fixed-time anchor',
  'The Bluebird is a small, timing-sensitive listening-room experience outside the main tourist core.',
  'When the itinerary contains the Bluebird Cafe, treat its reservation/show time as the evening anchor. Build dinner and travel around that fixed time; do not sandwich it between Downtown stops with unrealistic travel.',
  n.id,array['music','couples','first-visit'],95,true
from public.neighborhoods n where n.slug='green-hills'
union all
select 'neighborhood','Germantown rewards a clustered half-day',
  'The Farmers’ Market, Tennessee State Museum, First Horizon Park and Germantown dining can form a coherent block.',
  'When using Germantown, favor a clustered half-day that combines the market/museum area, neighborhood dining and a Sounds game when date-relevant. Avoid unnecessary Downtown round-trips between these stops.',
  n.id,array['first-visit','family','food','friends'],78,true
from public.neighborhoods n where n.slug='germantown'
union all
select 'neighborhood','East Nashville works best as a neighborhood evening',
  'East Nashville is stronger when food, drinks, shops and Five Points are experienced together rather than as isolated drive-by stops.',
  'Cluster East Nashville/Five Points stops into one contiguous block. For couples/food-focused trips, favor late afternoon through dinner/drinks; avoid bouncing Downtown → East → Downtown repeatedly.',
  n.id,array['couples','food','friends','first-visit'],82,true
from public.neighborhoods n where n.slug='east-nashville'
union all
select 'neighborhood','The Gulch pairs naturally with Downtown',
  'The Gulch is compact and close enough to Downtown to share a day without becoming a separate full-day itinerary.',
  'Use The Gulch as a meal/shopping/hotel block and pair it with Downtown/SoBro when useful. Minimize rideshare hops inside the compact Gulch core.',
  n.id,array['first-visit','couples','friends','business'],76,true
from public.neighborhoods n where n.slug='the-gulch'
union all
select 'neighborhood','Wedgewood-Houston is strongest as an arts + food block',
  'Wedgewood-Houston is best experienced as a concentrated creative-district stop rather than a single isolated venue.',
  'Cluster Wedgewood-Houston galleries, food/drink and nearby attractions in the same afternoon/evening. If an art crawl or venue event is date-relevant, let it anchor the block.',
  n.id,array['couples','friends','food','first-visit'],72,true
from public.neighborhoods n where n.slug='wedgewood-houston'
union all
select 'neighborhood','West End is a daytime culture + park block',
  'Centennial Park, the Parthenon and Vanderbilt/West End context fit naturally together.',
  'Prefer West End during the day and cluster Centennial Park/Parthenon with nearby Vanderbilt or Hillsboro Village stops. Do not treat it as a late-night destination unless a specific event requires it.',
  n.id,array['family','first-visit','couples'],74,true
from public.neighborhoods n where n.slug='west-end'
union all
select 'neighborhood','Music Row should be combined with adjacent districts',
  'Music Row is culturally important but usually not an all-day visitor district on its own.',
  'Use Music Row as part of a Midtown/West End/Gulch day. Avoid allocating an entire day unless the traveler has specific studio/history appointments or a music-industry focus.',
  n.id,array['music','first-visit','business'],70,true
from public.neighborhoods n where n.slug='music-row'
union all
select 'logistics','Opry / Music Valley needs a travel buffer',
  'Music Valley is geographically separate from the central urban neighborhoods and show times should anchor the trip block.',
  'When the Grand Ole Opry/Opry House is included, preserve a meaningful travel/parking buffer from Downtown and build the nearby block around the fixed show time. Do not schedule a tight central-Nashville stop immediately before it.',
  n.id,array['music','family','first-visit','couples'],94,true
from public.neighborhoods n where n.slug='music-valley'
union all
select 'logistics','Nissan Stadium events change river-crossing logistics',
  'Large stadium events can materially change Downtown/East Nashville movement before and after the event.',
  'When a Nissan Stadium event is date-relevant, treat it as a high-impact anchor. Add pre/post-event travel buffer, favor walkable Downtown/East Nashville stops, and avoid scheduling a fixed reservation immediately after expected egress.',
  null,array['sports','music','first-visit','friends','family'],96,true
union all
select 'logistics','Bridgestone event: stay Downtown before and after',
  'Arena events are easiest when the traveler is already Downtown rather than moving a car or rideshare across the city at event time.',
  'When a Bridgestone Arena event is included, favor a walkable Downtown/SoBro meal beforehand and Downtown nightlife afterward. Avoid an unnecessary neighborhood transfer inside the pre-event window.',
  n.id,array['sports','music','friends','first-visit'],90,true
from public.neighborhoods n where n.slug='downtown'
union all
select 'audience','Family itineraries need fewer late-night transfers',
  'Families generally benefit from clustered daytime attractions, predictable meals and lighter late-night movement.',
  'For family trips, prioritize daytime parks/museums/zoo-style attractions, cluster neighborhoods, and avoid building the itinerary around late-night Broadway unless explicitly requested.',
  null,array['family'],88,true;

insert into public.place_relationships(source_place_id,target_place_id,relationship_type,weight,note)
select a.id,b.id,'nearby',95,'Core Downtown music/culture cluster.' from public.places a, public.places b where a.slug='ryman-auditorium' and b.slug='country-music-hall-of-fame'
on conflict (source_place_id,target_place_id,relationship_type) do update set weight=excluded.weight,note=excluded.note;
insert into public.place_relationships(source_place_id,target_place_id,relationship_type,weight,note)
select a.id,b.id,'nearby',95,'Core Downtown music/culture cluster.' from public.places a, public.places b where a.slug='country-music-hall-of-fame' and b.slug='ryman-auditorium'
on conflict (source_place_id,target_place_id,relationship_type) do update set weight=excluded.weight,note=excluded.note;
insert into public.place_relationships(source_place_id,target_place_id,relationship_type,weight,note)
select a.id,b.id,'nearby',95,'Germantown market/museum pair.' from public.places a, public.places b where a.slug='nashville-farmers-market' and b.slug='tennessee-state-museum'
on conflict (source_place_id,target_place_id,relationship_type) do update set weight=excluded.weight,note=excluded.note;
insert into public.place_relationships(source_place_id,target_place_id,relationship_type,weight,note)
select a.id,b.id,'nearby',95,'Germantown market/museum pair.' from public.places a, public.places b where a.slug='tennessee-state-museum' and b.slug='nashville-farmers-market'
on conflict (source_place_id,target_place_id,relationship_type) do update set weight=excluded.weight,note=excluded.note;
insert into public.place_relationships(source_place_id,target_place_id,relationship_type,weight,note)
select a.id,b.id,'same_experience',100,'The Parthenon sits within Centennial Park; treat these as one itinerary stop/block.' from public.places a, public.places b where a.slug='the-parthenon' and b.slug='centennial-park'
on conflict (source_place_id,target_place_id,relationship_type) do update set weight=excluded.weight,note=excluded.note;
insert into public.place_relationships(source_place_id,target_place_id,relationship_type,weight,note)
select a.id,b.id,'same_experience',100,'Centennial Park and the Parthenon should normally be planned together.' from public.places a, public.places b where a.slug='centennial-park' and b.slug='the-parthenon'
on conflict (source_place_id,target_place_id,relationship_type) do update set weight=excluded.weight,note=excluded.note;
insert into public.place_relationships(source_place_id,target_place_id,relationship_type,weight,note)
select a.id,b.id,'nearby',92,'Walkable Downtown event/venue cluster.' from public.places a, public.places b where a.slug='bridgestone-arena' and b.slug='ryman-auditorium'
on conflict (source_place_id,target_place_id,relationship_type) do update set weight=excluded.weight,note=excluded.note;
insert into public.place_relationships(source_place_id,target_place_id,relationship_type,weight,note)
select a.id,b.id,'nearby',92,'Walkable Downtown event/venue cluster.' from public.places a, public.places b where a.slug='ryman-auditorium' and b.slug='bridgestone-arena'
on conflict (source_place_id,target_place_id,relationship_type) do update set weight=excluded.weight,note=excluded.note;
insert into public.place_relationships(source_place_id,target_place_id,relationship_type,weight,note)
select a.id,b.id,'nearby',85,'Germantown sports/market cluster.' from public.places a, public.places b where a.slug='first-horizon-park' and b.slug='nashville-farmers-market'
on conflict (source_place_id,target_place_id,relationship_type) do update set weight=excluded.weight,note=excluded.note;
insert into public.place_relationships(source_place_id,target_place_id,relationship_type,weight,note)
select a.id,b.id,'nearby',85,'Germantown sports/market cluster.' from public.places a, public.places b where a.slug='nashville-farmers-market' and b.slug='first-horizon-park'
on conflict (source_place_id,target_place_id,relationship_type) do update set weight=excluded.weight,note=excluded.note;
