create or replace view public.experience_auto_curation
with (security_invoker = true)
as
with base as (
  select
    q.*,
    coalesce((
      select array_agg(lower(vt.name) order by lower(vt.name))
      from jsonb_array_elements_text(coalesce(q.provider_tags, '[]'::jsonb)) j(tag_id)
      join public.viator_tags vt on vt.tag_id = j.tag_id::bigint
    ), '{}'::text[]) as tag_names,
    regexp_replace(lower(q.title), '[^a-z0-9]+', '', 'g') as duplicate_key
  from public.experience_curation_queue q
), scored as (
  select
    b.*,
    array_remove(array[
      case when b.tag_names && array['music tours']::text[] or b.title ~* '(music|songwriter|songwriting|grand ole opry|opry|recording studio)' then 'music' end,
      case when b.tag_names && array['food & drink','dining experiences','food tours','culinary & gourmet tour','beer & brewery tours','wine tastings','wine tours']::text[] or b.title ~* '(food|culinary|brewery|beer|wine|whiskey|whisky|distillery)' then 'food-drink' end,
      case when b.tag_names && array['historical tours','cultural tours']::text[] or b.title ~* '(history|historic|civil war)' then 'history' end,
      case when b.tag_names && array['walking tours','city tours','bus tours','hop on hop off']::text[] or b.title ~* '(city tour|sightseeing|trolley|walking tour)' then 'city-sightseeing' end,
      case when b.tag_names && array['attractions & museums','museum tickets & passes','museums']::text[] or b.title ~* '(museum|admission ticket|attraction)' then 'attractions-museums' end,
      case when b.tag_names && array['water tours']::text[] or b.title ~* '(boat|river|cruise|kayak|paddle)' then 'water-outdoors' end,
      case when b.tag_names && array['ghost tours']::text[] or b.title ~* '(ghost|haunted)' then 'ghost' end,
      case when b.tag_names && array['day trips','full-day tours']::text[] or b.title ~* '(day trip|daytrip|graceland|memphis|lynchburg|jack daniel)' then 'day-trip' end,
      case when b.tag_names && array['art tours']::text[] or b.title ~* '(art|mural)' then 'arts' end,
      case when b.tag_names && array['golf tours & tee times']::text[] or b.title ~* '(golf|tee time)' then 'golf' end,
      case when b.tag_names && array['private and luxury','private sightseeing tours']::text[] or coalesce(b.provider_flags,'[]'::jsonb) ? 'PRIVATE_TOUR' then 'private-luxury' end,
      case when b.title ~* '(party bus|party tractor|party boat|pedal|honky tonk)' then 'nightlife-party' end
    ]::text[], null) as suggested_categories,
    array_remove(array[
      case when b.title ~* '(party bus|party tractor|party boat|pedal|honky tonk|21\+)' then 'friends-groups' end,
      case when b.tag_names && array['small group']::text[] then 'small-groups' end,
      case when b.tag_names && array['private and luxury','private sightseeing tours']::text[] or coalesce(b.provider_flags,'[]'::jsonb) ? 'PRIVATE_TOUR' then 'couples-private' end,
      case when b.tag_names && array['attractions & museums','museum tickets & passes','museums']::text[] and b.title !~* '(21\+|party)' then 'families' end,
      case when b.tag_names && array['music tours']::text[] or b.title ~* '(music|songwriter|opry)' then 'music-focused' end,
      case when b.tag_names && array['food & drink','dining experiences','food tours','beer & brewery tours']::text[] or b.title ~* '(food|culinary|brewery|distillery)' then 'food-drink-focused' end,
      case when b.tag_names && array['walking tours','city tours','bus tours','historical tours']::text[] then 'first-time-visitors' end
    ]::text[], null) as suggested_traveler_types,
    array_remove(array[
      case when coalesce(b.review_count,0) < 5 then 'low-review-count' end,
      case when b.rating_value is not null and b.rating_value < 4.0 then 'low-rating' end,
      case when coalesce(b.from_price,0) >= 500 then 'high-price' end,
      case when b.title ~* '(memphis|graceland|lynchburg|jack daniel|kentucky)' then 'outside-nashville-core' end,
      case when b.title ~* '(airport transfer|hotel transfer|transportation)' then 'transport-oriented' end,
      case when b.title ~* '(21\+|21 and over|adults only)' then 'age-restricted' end
    ]::text[], null) as curation_flags,
    least(100, greatest(0,
      35
      + case
          when b.rating_value >= 4.8 then 15
          when b.rating_value >= 4.6 then 12
          when b.rating_value >= 4.4 then 8
          when b.rating_value >= 4.0 then 3
          when b.rating_value is null then 0
          else -12
        end
      + case
          when b.review_count >= 1000 then 15
          when b.review_count >= 500 then 12
          when b.review_count >= 100 then 9
          when b.review_count >= 25 then 6
          when b.review_count >= 5 then 2
          else -5
        end
      + case when 'top product' = any(b.tag_names) then 8 else 0 end
      + case when 'excellent quality' = any(b.tag_names) then 6 else 0 end
      + case when 'curated catalog' = any(b.tag_names) then 5 else 0 end
      + case when 'best conversion' = any(b.tag_names) then 4 else 0 end
      + case when b.tag_names && array['likely to sell out','likely to sellout']::text[] then 4 else 0 end
      + case when b.tag_names && array['low supplier cancellation rate','low last minute supplier cancellation rate']::text[] then 3 else 0 end
      - case when b.title ~* '(airport transfer|hotel transfer|transportation)' then 8 else 0 end
      - case when b.title ~* '(memphis|graceland|lynchburg|jack daniel|kentucky)' then 4 else 0 end
    ))::smallint as discovery_score
  from base b
)
select
  s.*,
  case
    when s.discovery_score >= 70 then 'priority-review'
    when s.discovery_score >= 55 then 'standard-review'
    else 'long-tail'
  end as discovery_bucket
from scored s;

create or replace view public.experience_duplicate_candidates
with (security_invoker = true)
as
select
  duplicate_key,
  count(*) as candidate_count,
  array_agg(id order by review_count desc nulls last) as experience_ids,
  array_agg(title order by review_count desc nulls last) as titles,
  max(review_count) as max_review_count
from public.experience_auto_curation
group by duplicate_key
having count(*) > 1;

revoke all on public.experience_auto_curation, public.experience_duplicate_candidates from anon, authenticated;
grant select on public.experience_auto_curation, public.experience_duplicate_candidates to service_role;
