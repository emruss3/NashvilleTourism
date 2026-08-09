create table if not exists public.system_documents (
  id uuid primary key default gen_random_uuid(),
  document_key text not null unique,
  title text not null,
  version integer not null default 1,
  status text not null default 'active' check (status in ('draft','active','archived')),
  content jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.system_documents enable row level security;
revoke all on public.system_documents from anon, authenticated;
grant all on public.system_documents to service_role;
create trigger system_documents_set_updated_at before update on public.system_documents for each row execute function public.set_updated_at();

insert into public.data_sources (provider_key,name,source_type,base_url,terms_url,attribution_required,attribution_text,default_ttl_minutes,can_display_rating,can_display_reviews,can_store_raw,active,notes)
values
('foursquare_os','Foursquare OS Places','places','https://places.foursquare.com/','https://opensource.org/license/apache-2-0',true,'Foursquare',10080,false,false,true,false,'Primary durable POI backbone. Apache 2.0 dataset delivered through the Foursquare Places Portal/Iceberg catalog. Activate after Places Portal access token is configured.'),
('google_places','Google Places','places','https://places.googleapis.com/','https://developers.google.com/maps/terms',true,'Google',60,true,true,false,false,'Live validation/enrichment only. Persist Google Place IDs; do not use Google as the permanent Nashroam POI database. Activate after Google Places API credentials and display rules are configured.'),
('vivid_seats','Vivid Seats','tickets','https://www.vividseats.com/','https://www.vividseats.com/terms',true,'Vivid Seats',60,false,false,false,false,'Affiliate/deep-link and potential white-label/partner ticket source. Public affiliate program supports deep links and commissions; no public consumer inventory API has been verified. Keep inactive until affiliate/partner credentials or feed access are approved.')
on conflict (provider_key) do update set
 name=excluded.name, source_type=excluded.source_type, base_url=excluded.base_url, terms_url=excluded.terms_url,
 attribution_required=excluded.attribution_required, attribution_text=excluded.attribution_text,
 default_ttl_minutes=excluded.default_ttl_minutes, can_display_rating=excluded.can_display_rating,
 can_display_reviews=excluded.can_display_reviews, can_store_raw=excluded.can_store_raw,
 notes=excluded.notes, updated_at=now();

insert into public.system_documents (document_key,title,version,status,content,notes)
values (
 'data_refresh_strategy',
 'Nashroam Data Refresh & Source Strategy',
 1,
 'active',
 jsonb_build_object(
   'principle','Nashroam owns durable Nashville identity, editorial judgment and planner context. External providers supply volatile operational/commercial facts. Every external field retains provenance, fetched_at and expiry.',
   'source_hierarchy', jsonb_build_array(
      jsonb_build_object('source','Foursquare OS Places','role','durable POI backbone','storage','permanent under Apache 2.0','cadence','monthly/full release plus deltas when configured'),
      jsonb_build_object('source','Official business/venue sites','role','authoritative operational facts','storage','durable facts/URLs only','cadence','daily for high-priority listings; exception-driven otherwise'),
      jsonb_build_object('source','Google Places','role','just-in-time validation of status/hours/ratings','storage','Google Place ID durable; volatile content not used as permanent warehouse','cadence','on-demand for shortlisted itinerary candidates'),
      jsonb_build_object('source','Yelp','role','consumer sentiment/rating/review count where licensed','storage','short-lived cache only per agreement','cadence','daily where enabled'),
      jsonb_build_object('source','OpenTable','role','restaurant reservation availability/deep links','storage','availability on-demand','cadence','planner-time query'),
      jsonb_build_object('source','Viator','role','tours/experiences catalog, pricing, affiliate URLs','storage','canonical subset plus expiring source state','cadence','search/catalog refresh daily; availability on demand'),
      jsonb_build_object('source','Ticketmaster','role','primary events/concerts/sports feed','storage','canonical events plus expiring source link','cadence','every few hours; more frequent near event date'),
      jsonb_build_object('source','SeatGeek','role','secondary event/ticket coverage and affiliate option','storage','canonical event links/state when enabled','cadence','every few hours'),
      jsonb_build_object('source','Vivid Seats','role','secondary ticket marketplace/affiliate deep links','storage','partner IDs/URLs only until formal feed access exists','cadence','on-demand/deep-link until partner feed approved'),
      jsonb_build_object('source','NCVC/direct venue calendars','role','Nashville festivals/community/local-event context','storage','canonical event facts','cadence','daily')
   ),
   'priority_tiers', jsonb_build_object(
      'tier_a','~150 high-frequency places: daily operational refresh + just-in-time validation',
      'tier_b','~300 secondary recommendations: every 2-3 days',
      'tier_c','long tail: weekly or when entering an itinerary candidate set'
   ),
   'planner_rule','Planner never invents a place/event/experience or operational fact. Recommendations must resolve to Supabase IDs and pass freshness/confidence checks before presentation.',
   'conflict_rule','Provider disagreement creates/updates verification_queue; humans work exceptions instead of manually auditing the whole catalog.',
   'monetization_rule','Affiliate economics never silently override editorial ranking. Sponsored/commercial placement must remain distinct from Nashroam editorial score.'
 ),
 'Source-of-truth strategy for automated ingestion, refresh cadence, planner eligibility, licensing boundaries and affiliate ticketing.'
)
on conflict (document_key) do update set
 title=excluded.title,
 version=public.system_documents.version+1,
 status='active',
 content=excluded.content,
 notes=excluded.notes,
 updated_at=now();
