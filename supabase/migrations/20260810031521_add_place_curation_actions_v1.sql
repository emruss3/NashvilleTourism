alter table public.places
  add column if not exists curation_status text not null default 'pending' check (curation_status in ('pending','approved','rejected','needs_review')),
  add column if not exists curation_notes text,
  add column if not exists approved_at timestamptz;

create index if not exists places_curation_idx on public.places(curation_status,is_published,status,primary_category);

create or replace view public.place_curation_queue with (security_invoker = true) as
select p.id,p.slug,p.name,p.primary_category,p.subcategories,p.cuisine,p.price_level,p.address_line1,p.city,p.state,p.postal_code,p.phone,p.website_url,p.reservation_url,p.status,p.is_published,p.curation_status,p.curation_notes,n.name as neighborhood_name,n.slug as neighborhood_slug,pe.nashroam_score,pe.summary,pe.local_note,pe.vibe,pe.best_for,pe.traveler_types,pe.meal_periods,pe.typical_duration_minutes,pe.family_friendly,pe.group_friendly,pe.reservation_recommended,pe.planner_priority,ph.confidence_score,ph.needs_review,ph.review_reason,psi.external_url as official_source_url,pss.business_status as official_business_status,pss.fetched_at as official_checked_at,pss.expires_at as official_expires_at
from public.places p
left join public.neighborhoods n on n.id=p.neighborhood_id
left join public.place_editorial pe on pe.place_id=p.id
left join public.place_health ph on ph.place_id=p.id
left join public.data_sources ds on ds.provider_key='official_website'
left join public.place_source_ids psi on psi.place_id=p.id and psi.source_id=ds.id
left join public.place_source_state pss on pss.place_id=p.id and pss.source_id=ds.id;
revoke all on public.place_curation_queue from anon, authenticated;
grant select on public.place_curation_queue to service_role;

create or replace function public.approve_place(p_place_id uuid,p_nashroam_score numeric,p_planner_priority smallint,p_summary text,p_local_note text,p_best_for text[] default '{}',p_traveler_types text[] default '{}',p_vibe text[] default '{}',p_meal_periods text[] default '{}',p_cuisine text[] default '{}',p_price_level smallint default null,p_typical_duration_minutes integer default null,p_family_friendly boolean default null,p_group_friendly boolean default null,p_reservation_recommended boolean default null,p_reservation_url text default null,p_curation_notes text default null)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_confidence smallint; v_needs_review boolean; v_status text;
begin
  if auth.role()<>'service_role' then raise exception 'service_role required'; end if;
  if p_nashroam_score<0 or p_nashroam_score>100 then raise exception 'score must be 0-100'; end if;
  if p_planner_priority<0 or p_planner_priority>100 then raise exception 'planner priority must be 0-100'; end if;
  if p_summary is null or length(trim(p_summary))<20 then raise exception 'summary required'; end if;
  if p_local_note is null or length(trim(p_local_note))<12 then raise exception 'local note required'; end if;
  if p_price_level is not null and (p_price_level<1 or p_price_level>4) then raise exception 'price level must be 1-4'; end if;
  select p.status,ph.confidence_score,ph.needs_review into v_status,v_confidence,v_needs_review from public.places p left join public.place_health ph on ph.place_id=p.id where p.id=p_place_id for update of p;
  if v_status is null then raise exception 'place not found'; end if;
  if v_status<>'active' then raise exception 'place must be active'; end if;
  if coalesce(v_confidence,0)<60 then raise exception 'place confidence too low for publishing'; end if;
  if coalesce(v_needs_review,false) then raise exception 'place has unresolved verification review'; end if;
  update public.places set cuisine=coalesce(p_cuisine,'{}'),price_level=p_price_level,reservation_url=coalesce(nullif(trim(p_reservation_url),''),reservation_url),curation_status='approved',curation_notes=nullif(trim(p_curation_notes),''),approved_at=now(),is_published=true,updated_at=now() where id=p_place_id;
  insert into public.place_editorial(place_id,nashroam_score,summary,local_note,vibe,best_for,traveler_types,meal_periods,typical_duration_minutes,family_friendly,group_friendly,reservation_recommended,planner_priority,source_note,last_human_verified_at)
  values(p_place_id,p_nashroam_score,trim(p_summary),trim(p_local_note),coalesce(p_vibe,'{}'),coalesce(p_best_for,'{}'),coalesce(p_traveler_types,'{}'),coalesce(p_meal_periods,'{}'),p_typical_duration_minutes,p_family_friendly,p_group_friendly,p_reservation_recommended,p_planner_priority,'Human Nashroam editorial approval',now())
  on conflict(place_id) do update set nashroam_score=excluded.nashroam_score,summary=excluded.summary,local_note=excluded.local_note,vibe=excluded.vibe,best_for=excluded.best_for,traveler_types=excluded.traveler_types,meal_periods=excluded.meal_periods,typical_duration_minutes=excluded.typical_duration_minutes,family_friendly=excluded.family_friendly,group_friendly=excluded.group_friendly,reservation_recommended=excluded.reservation_recommended,planner_priority=excluded.planner_priority,source_note=excluded.source_note,last_human_verified_at=excluded.last_human_verified_at,updated_at=now();
  update public.verification_queue set status='resolved',resolved_at=now(),resolution_notes='Resolved by place approval',updated_at=now() where entity_type='place' and entity_id=p_place_id and status in ('open','in_review');
end;$$;

create or replace function public.reject_place(p_place_id uuid,p_curation_notes text)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  if auth.role()<>'service_role' then raise exception 'service_role required'; end if;
  if p_curation_notes is null or length(trim(p_curation_notes))<8 then raise exception 'rejection reason required'; end if;
  update public.places set curation_status='rejected',curation_notes=trim(p_curation_notes),is_published=false,approved_at=null,updated_at=now() where id=p_place_id;
  if not found then raise exception 'place not found'; end if;
  update public.verification_queue set status='resolved',resolved_at=now(),resolution_notes='Rejected from Nashroam corpus: '||trim(p_curation_notes),updated_at=now() where entity_type='place' and entity_id=p_place_id and status in ('open','in_review');
end;$$;

revoke all on function public.approve_place(uuid,numeric,smallint,text,text,text[],text[],text[],text[],text[],smallint,integer,boolean,boolean,boolean,text,text) from public,anon,authenticated;
grant execute on function public.approve_place(uuid,numeric,smallint,text,text,text[],text[],text[],text[],text[],smallint,integer,boolean,boolean,boolean,text,text) to service_role;
revoke all on function public.reject_place(uuid,text) from public,anon,authenticated;
grant execute on function public.reject_place(uuid,text) to service_role;
