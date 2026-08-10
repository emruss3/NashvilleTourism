with verified(slug,address,postal,phone,website,source_url) as (
  values
    ('ascend-amphitheater','310 First Avenue South','37201',null::text,'https://www.ascendamphitheater.com/','https://www.ascendamphitheater.com/about/contact'),
    ('nissan-stadium','One Titans Way','37213','615-565-4300','https://www.tennesseetitans.com/stadium/','https://www.tennesseetitans.com/about-us/'),
    ('geodis-park','501 Benton Ave','37203',null::text,'https://www.nashvillesc.com/geodispark/','https://www.nashvillesc.com/news/2026-matchday-guide'),
    ('first-horizon-park','19 Junior Gilliam Way','37219','615-690-4487','https://www.milb.com/nashville/ballpark','https://www.milb.com/nashville/ballpark/howtogethere')
)
update public.places p
set address_line1=v.address,
    city='Nashville',
    state='TN',
    postal_code=v.postal,
    phone=coalesce(v.phone,p.phone),
    website_url=v.website,
    status='active',
    updated_at=now()
from verified v
where p.slug=v.slug;

with source as (
  select id from public.data_sources where provider_key='official_website'
), verified(slug,website,source_url) as (
  values
    ('ascend-amphitheater','https://www.ascendamphitheater.com/','https://www.ascendamphitheater.com/about/contact'),
    ('nissan-stadium','https://www.tennesseetitans.com/stadium/','https://www.tennesseetitans.com/about-us/'),
    ('geodis-park','https://www.nashvillesc.com/geodispark/','https://www.nashvillesc.com/news/2026-matchday-guide'),
    ('first-horizon-park','https://www.milb.com/nashville/ballpark','https://www.milb.com/nashville/ballpark/howtogethere')
)
insert into public.place_source_ids(place_id,source_id,external_id,external_url,is_primary,last_matched_at,metadata)
select p.id,s.id,v.website,v.source_url,true,now(),jsonb_build_object('verification','official_site','verified_fields',array['address','website','phone','active_status'])
from verified v
join public.places p on p.slug=v.slug
cross join source s
on conflict (place_id,source_id) do update set
  external_id=excluded.external_id,
  external_url=excluded.external_url,
  is_primary=excluded.is_primary,
  last_matched_at=excluded.last_matched_at,
  metadata=excluded.metadata;

with source as (
  select id from public.data_sources where provider_key='official_website'
), targets as (
  select p.id from public.places p where p.slug in ('ascend-amphitheater','nissan-stadium','geodis-park','first-horizon-park')
)
insert into public.place_source_state(place_id,source_id,business_status,fetched_at,expires_at,display_allowed,attribution,metadata)
select t.id,s.id,'active_verified',now(),now()+interval '30 days',true,'Official website',jsonb_build_object('verified_at',now(),'volatile_fields_stored',false)
from targets t cross join source s
on conflict (place_id,source_id) do update set
  business_status=excluded.business_status,
  fetched_at=excluded.fetched_at,
  expires_at=excluded.expires_at,
  display_allowed=excluded.display_allowed,
  attribution=excluded.attribution,
  metadata=excluded.metadata,
  updated_at=now();

insert into public.place_health(place_id,confidence_score,last_checked_at,last_human_verified_at,needs_review,review_reason,last_good_snapshot_at)
select p.id,80,now(),now(),false,null,now()
from public.places p
where p.slug in ('ascend-amphitheater','nissan-stadium','geodis-park','first-horizon-park')
on conflict (place_id) do update set
  confidence_score=greatest(public.place_health.confidence_score,80),
  last_checked_at=excluded.last_checked_at,
  last_human_verified_at=excluded.last_human_verified_at,
  needs_review=false,
  review_reason=null,
  last_good_snapshot_at=excluded.last_good_snapshot_at,
  updated_at=now();
