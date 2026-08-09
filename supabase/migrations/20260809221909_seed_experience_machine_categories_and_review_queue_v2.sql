alter table public.verification_queue drop constraint if exists verification_queue_entity_type_check;
alter table public.verification_queue add constraint verification_queue_entity_type_check check (entity_type in ('place','event','experience','source','neighborhood','other'));

update public.experiences e
set
  categories = ac.suggested_categories,
  experience_type = case
    when 'music' = any(ac.suggested_categories) then 'music'
    when 'food-drink' = any(ac.suggested_categories) then 'food_drink'
    when 'attractions-museums' = any(ac.suggested_categories) then 'attraction'
    when 'water-outdoors' = any(ac.suggested_categories) then 'outdoor'
    when 'day-trip' = any(ac.suggested_categories) then 'day_trip'
    when 'nightlife-party' = any(ac.suggested_categories) then 'nightlife'
    when 'ghost' = any(ac.suggested_categories) then 'ghost'
    else 'tour'
  end,
  updated_at = now()
from public.experience_auto_curation ac
where ac.id = e.id
  and e.curation_status = 'pending';

update public.experiences e
set
  duration_min_minutes = coalesce(e.duration_min_minutes, ess.duration_min_minutes),
  duration_max_minutes = coalesce(e.duration_max_minutes, ess.duration_max_minutes),
  updated_at = now()
from public.experience_source_state ess
join public.data_sources ds on ds.id = ess.source_id and ds.provider_key = 'viator'
where ess.experience_id = e.id
  and e.curation_status = 'pending';

insert into public.verification_queue (
  entity_type, entity_id, reason_code, severity, details, status
)
select
  'experience',
  ac.id,
  'experience_priority_curation',
  'medium',
  jsonb_build_object(
    'discovery_score', ac.discovery_score,
    'discovery_bucket', ac.discovery_bucket,
    'suggested_categories', ac.suggested_categories,
    'suggested_traveler_types', ac.suggested_traveler_types,
    'curation_flags', ac.curation_flags,
    'viator_product_code', ac.viator_product_code,
    'rating_value', ac.rating_value,
    'review_count', ac.review_count
  ),
  'open'
from public.experience_auto_curation ac
where ac.discovery_bucket = 'priority-review'
  and not exists (
    select 1 from public.verification_queue vq
    where vq.entity_type = 'experience'
      and vq.entity_id = ac.id
      and vq.reason_code = 'experience_priority_curation'
      and vq.status in ('open','in_review')
  );
