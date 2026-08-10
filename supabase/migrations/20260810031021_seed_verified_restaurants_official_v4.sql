with verified(slug,name,hood,address,postal,phone,website,source_url) as (
  values
    ('folk','Folk','east-nashville','823 Meridian St.','37207','615-610-2595','https://www.goodasfolk.com/','https://www.goodasfolk.com/about'),
    ('lyra','Lyra','east-nashville','935 W. Eastland Ave','37216','615-928-8040','https://www.lyranashville.com/','https://www.lyranashville.com/'),
    ('xiao-bao','Xiao Bao','east-nashville','830 Meridian Street','37207',null::text,'https://www.xiaobaonashville.com/','https://www.xiaobaonashville.com/contact-us'),
    ('cafe-roze','Cafe Roze','east-nashville','1115 Porter Road','37206','615-645-9100','https://www.caferoze.com/','https://www.caferoze.com/contact/'),
    ('butcher-and-bee','Butcher & Bee','east-nashville','902 Main St','37206','615-229-5019','https://butcherandbee.com/locations/Nashville','https://butcherandbee.com/locations/Nashville')
)
insert into public.places(slug,name,neighborhood_id,primary_category,address_line1,city,state,postal_code,phone,website_url,status,is_published)
select v.slug,v.name,n.id,'restaurant',v.address,'Nashville','TN',v.postal,v.phone,v.website,'active',false from verified v left join public.neighborhoods n on n.slug=v.hood
on conflict (slug) do update set name=excluded.name,neighborhood_id=coalesce(public.places.neighborhood_id,excluded.neighborhood_id),primary_category='restaurant',address_line1=excluded.address_line1,city='Nashville',state='TN',postal_code=excluded.postal_code,phone=coalesce(excluded.phone,public.places.phone),website_url=excluded.website_url,status='active',updated_at=now();
with source as (select id from public.data_sources where provider_key='official_website'), verified(slug,website,source_url) as (values ('folk','https://www.goodasfolk.com/','https://www.goodasfolk.com/about'),('lyra','https://www.lyranashville.com/','https://www.lyranashville.com/'),('xiao-bao','https://www.xiaobaonashville.com/','https://www.xiaobaonashville.com/contact-us'),('cafe-roze','https://www.caferoze.com/','https://www.caferoze.com/contact/'),('butcher-and-bee','https://butcherandbee.com/locations/Nashville','https://butcherandbee.com/locations/Nashville'))
insert into public.place_source_ids(place_id,source_id,external_id,external_url,is_primary,last_matched_at,metadata)
select p.id,s.id,v.website,v.source_url,true,now(),jsonb_build_object('verification','official_site','verified_fields',array['name','address','website','phone','active_status']) from verified v join public.places p on p.slug=v.slug cross join source s
on conflict (place_id,source_id) do update set external_id=excluded.external_id,external_url=excluded.external_url,is_primary=true,last_matched_at=excluded.last_matched_at,metadata=excluded.metadata;
with source as (select id from public.data_sources where provider_key='official_website'), targets as (select id from public.places where slug in ('folk','lyra','xiao-bao','cafe-roze','butcher-and-bee'))
insert into public.place_source_state(place_id,source_id,business_status,fetched_at,expires_at,display_allowed,attribution,metadata)
select t.id,s.id,'active_verified',now(),now()+interval '30 days',true,'Official website',jsonb_build_object('verified_at',now(),'volatile_fields_stored',false) from targets t cross join source s
on conflict (place_id,source_id) do update set business_status=excluded.business_status,fetched_at=excluded.fetched_at,expires_at=excluded.expires_at,display_allowed=true,attribution=excluded.attribution,metadata=excluded.metadata,updated_at=now();
insert into public.place_health(place_id,confidence_score,last_checked_at,needs_review,review_reason,last_good_snapshot_at)
select id,80,now(),false,null,now() from public.places where slug in ('folk','lyra','xiao-bao','cafe-roze','butcher-and-bee')
on conflict (place_id) do update set confidence_score=greatest(public.place_health.confidence_score,80),last_checked_at=excluded.last_checked_at,needs_review=false,review_reason=null,last_good_snapshot_at=excluded.last_good_snapshot_at,updated_at=now();
