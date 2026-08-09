create extension if not exists pg_cron;

create or replace function public.refresh_experience_machine_curation()
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  categorized_count integer := 0;
  queued_count integer := 0;
begin
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
  get diagnostics categorized_count = row_count;

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
  get diagnostics queued_count = row_count;

  return jsonb_build_object(
    'categorized', categorized_count,
    'new_priority_queue_items', queued_count,
    'refreshed_at', now()
  );
end;
$$;

revoke all on function public.refresh_experience_machine_curation() from public, anon, authenticated;
grant execute on function public.refresh_experience_machine_curation() to service_role;
