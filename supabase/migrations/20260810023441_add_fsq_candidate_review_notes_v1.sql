alter table public.fsq_os_place_candidates add column if not exists review_notes text;

create or replace function public.ignore_fsq_os_candidate(
  p_fsq_place_id text,
  p_notes text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role required';
  end if;
  if p_notes is null or length(trim(p_notes)) < 4 then
    raise exception 'ignore reason required';
  end if;
  update public.fsq_os_place_candidates
  set candidate_status = 'ignored', review_notes = trim(p_notes), updated_at = now()
  where fsq_place_id = p_fsq_place_id;
end;
$$;

revoke all on function public.ignore_fsq_os_candidate(text,text) from public, anon, authenticated;
grant execute on function public.ignore_fsq_os_candidate(text,text) to service_role;
