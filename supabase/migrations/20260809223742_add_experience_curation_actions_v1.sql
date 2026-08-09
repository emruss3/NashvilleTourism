create or replace function public.approve_experience(
  p_experience_id uuid,
  p_nashroam_score numeric,
  p_planner_priority smallint,
  p_local_note text,
  p_best_for text[] default '{}'::text[],
  p_traveler_types text[] default '{}'::text[],
  p_curation_notes text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_title text;
begin
  if p_nashroam_score is null or p_nashroam_score < 0 or p_nashroam_score > 100 then
    raise exception 'nashroam_score must be between 0 and 100';
  end if;
  if p_planner_priority is null or p_planner_priority < 0 or p_planner_priority > 100 then
    raise exception 'planner_priority must be between 0 and 100';
  end if;
  if nullif(btrim(coalesce(p_local_note,'')), '') is null then
    raise exception 'local_note is required for approval';
  end if;

  select title into v_title
  from public.experiences
  where id = p_experience_id
  for update;

  if not found then
    raise exception 'experience % not found', p_experience_id;
  end if;

  update public.experiences
  set curation_status = 'approved',
      curation_notes = p_curation_notes,
      approved_at = now(),
      status = 'active',
      is_published = true,
      updated_at = now()
  where id = p_experience_id;

  insert into public.experience_editorial (
    experience_id, nashroam_score, planner_priority, local_note,
    best_for, traveler_types, human_verified_at, updated_at
  )
  values (
    p_experience_id, p_nashroam_score, p_planner_priority, btrim(p_local_note),
    coalesce(p_best_for,'{}'::text[]), coalesce(p_traveler_types,'{}'::text[]), now(), now()
  )
  on conflict (experience_id) do update set
    nashroam_score = excluded.nashroam_score,
    planner_priority = excluded.planner_priority,
    local_note = excluded.local_note,
    best_for = excluded.best_for,
    traveler_types = excluded.traveler_types,
    human_verified_at = excluded.human_verified_at,
    updated_at = now();

  update public.verification_queue
  set status = 'resolved',
      resolved_at = now(),
      resolution_notes = coalesce(p_curation_notes, 'Approved through experience curation action'),
      updated_at = now()
  where entity_type = 'experience'
    and entity_id = p_experience_id
    and status in ('open','in_review');

  return jsonb_build_object(
    'ok', true,
    'action', 'approved',
    'experience_id', p_experience_id,
    'title', v_title,
    'nashroam_score', p_nashroam_score,
    'planner_priority', p_planner_priority,
    'published', true,
    'approved_at', now()
  );
end;
$$;

create or replace function public.reject_experience(
  p_experience_id uuid,
  p_curation_notes text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_title text;
begin
  if nullif(btrim(coalesce(p_curation_notes,'')), '') is null then
    raise exception 'curation_notes are required for rejection';
  end if;

  select title into v_title
  from public.experiences
  where id = p_experience_id
  for update;

  if not found then
    raise exception 'experience % not found', p_experience_id;
  end if;

  update public.experiences
  set curation_status = 'rejected',
      curation_notes = btrim(p_curation_notes),
      approved_at = null,
      status = 'inactive',
      is_published = false,
      updated_at = now()
  where id = p_experience_id;

  update public.verification_queue
  set status = 'resolved',
      resolved_at = now(),
      resolution_notes = 'Rejected: ' || btrim(p_curation_notes),
      updated_at = now()
  where entity_type = 'experience'
    and entity_id = p_experience_id
    and status in ('open','in_review');

  return jsonb_build_object(
    'ok', true,
    'action', 'rejected',
    'experience_id', p_experience_id,
    'title', v_title,
    'published', false,
    'rejected_at', now()
  );
end;
$$;

revoke all on function public.approve_experience(uuid,numeric,smallint,text,text[],text[],text) from public, anon, authenticated;
revoke all on function public.reject_experience(uuid,text) from public, anon, authenticated;
grant execute on function public.approve_experience(uuid,numeric,smallint,text,text[],text[],text) to service_role;
grant execute on function public.reject_experience(uuid,text) to service_role;
