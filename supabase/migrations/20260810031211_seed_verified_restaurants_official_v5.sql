with verified(slug,name,hood,address,postal,phone,website,source_url) as (
  values
    ('kayne-prime','Kayne Prime','the-gulch','1103 McGavock St','37203',null::text,'https://www.mstreetnashville.com/kayne-prime','https://www.mstreetnashville.com/private-events'),
    ('etch','Etch','sobro','303 Demonbreun St.','37201','615-522-0685','https://etchrestaurant.com/nashville/','https://etchrestaurant.com/contact/'),
    ('yolan','Yolan','sobro','403 4th Avenue South','37201',null::text,'https://www.yolannashville.com/','https://www.yolannashville.com/details')
)
insert into public.places(slug,name,neighborhood_id,primary_category,address_line1,city,state,postal_code,phone,website_url,status,is_published)
select v.slug,v.name,n.id,'restaurant',v.address,'Nashville','TN',v.postal,v.phone,v.website,'active',false from verified v left join public.neighborhoods n on n.slug=v.hood
on conflict (slug) do update set name=excluded.name,neighborhood_id=coalesce(public.places.neighborhood_id,excluded.neighborhood_id),primary_category='restaurant',address_line1=excluded.address_line1,city='Nashville',state='TN',postal_code=excluded.postal_code,phone=coalesce(excluded.phone,public.places.phone),website_url=excluded.website_url,status='active',updated_at=now();
with source as (select id from public.data_sources where provider_key='official_website'), verified(slug,website,source_url) as (values ('kayne-prime','https://www.mstreetnashville.com/kayne-prime','https://www.mstreetnashville.com/private-events'),('etch','https://etchrestaurant.com/nashville/','https://etchrestaurant.com/contact/'),('yolan','https://www.yolannashville.com/','https://www.yolannashville.com/details'))
insert into public.place_source_ids(place_id,source_id,external_id,external_url,is_primary,last_matched_at,metadata)
select p.id,s.id,v.website,v.source_url,true,now(),jsonb_build_object('verification','official_site','verified_fields',array['name','address','website','phone','active_status']) from verified v join public.places p on p.slug=v.slug cross join source s
on conflict (place_id,source_id) do update set external_id=excluded.external_id,external_url=excluded.external_url,is_primary=true,last_matched_at=excluded.last_matched_at,metadata=excluded.metadata;
with source as (select id from public.data_sources where provider_key='official_website'), targets as (select id from public.places where slug in ('kayne-prime','etch','yolan'))
insert into public.place_source_state(place_id,source_id,business_status,fetched_at,expires_at,display_allowed,attribution,metadata)
select t.id,s.id,'active_verified',now(),now()+interval '30 days',true,'Official website',jsonb_build_object('verified_at',now(),'volatile_fields_stored',false) from targets t cross join source s
on conflict (place_id,source_id) do update set business_status=excluded.business_status,fetched_at=excluded.fetched_at,expires_at=excluded.expires_at,display_allowed=true,attribution=excluded.attribution,metadata=excluded.metadata,updated_at=now();
insert into public.place_health(place_id,confidence_score,last_checked_at,needs_review,review_reason,last_good_snapshot_at)
select id,80,now(),false,null,now() from public.places where slug in ('kayne-prime','etch','yolan')
on conflict (place_id) do update set confidence_score=greatest(public.place_health.confidence_score,80),last_checked_at=excluded.last_checked_at,needs_review=false,review_reason=null,last_good_snapshot_at=excluded.last_good_snapshot_at,updated_at=now();
