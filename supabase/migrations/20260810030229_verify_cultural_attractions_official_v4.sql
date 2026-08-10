with verified(slug,address,postal,phone,website,source_url) as (
  values
    ('nashville-farmers-market','900 Rosa L Parks Boulevard','37208','615-339-8148','https://www.nashvillefarmersmarket.org/','https://www.nashvillefarmersmarket.org/who'),
    ('tennessee-state-museum','1000 Rosa L. Parks Blvd','37208','615-741-2692','https://tnmuseum.org/','https://tnmuseum.org/plan-your-visit'),
    ('the-parthenon','2500 West End Avenue','37203','615-862-8431','https://www.nashvilleparthenon.com/','https://www.nashville.gov/departments/parks/parthenon'),
    ('centennial-park','2500 West End Avenue','37203','615-862-8400','https://www.nashville.gov/departments/parks/parks/centennial-park','https://www.nashville.gov/departments/parks/parks/centennial-park'),
    ('cheekwood-estate-gardens','1200 Forrest Park Drive','37205','615-356-8000','https://cheekwood.org/','https://cheekwood.org/contact/')
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
    ('nashville-farmers-market','https://www.nashvillefarmersmarket.org/','https://www.nashvillefarmersmarket.org/who'),
    ('tennessee-state-museum','https://tnmuseum.org/','https://tnmuseum.org/plan-your-visit'),
    ('the-parthenon','https://www.nashvilleparthenon.com/','https://www.nashville.gov/departments/parks/parthenon'),
    ('centennial-park','https://www.nashville.gov/departments/parks/parks/centennial-park','https://www.nashville.gov/departments/parks/parks/centennial-park'),
    ('cheekwood-estate-gardens','https://cheekwood.org/','https://cheekwood.org/contact/')
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
  select p.id from public.places p where p.slug in ('nashville-farmers-market','tennessee-state-museum','the-parthenon','centennial-park','cheekwood-estate-gardens')
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
where p.slug in ('nashville-farmers-market','tennessee-state-museum','the-parthenon','centennial-park','cheekwood-estate-gardens')
on conflict (place_id) do update set
  confidence_score=greatest(public.place_health.confidence_score,80),
  last_checked_at=excluded.last_checked_at,
  last_human_verified_at=excluded.last_human_verified_at,
  needs_review=false,
  review_reason=null,
  last_good_snapshot_at=excluded.last_good_snapshot_at,
  updated_at=now();
