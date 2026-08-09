update public.system_documents
set version = version + 1,
    content = jsonb_build_object(
      'principle','Nashroam owns durable Nashville identity, editorial judgment, relationships and planner context. External providers supply volatile operational/commercial facts. Every external field retains provenance, fetched_at and expiry.',
      'current_state', jsonb_build_object(
        'places',22,
        'published_places',0,
        'experiences',188,
        'approved_experiences',0,
        'published_experiences',0,
        'priority_experience_review_queue',49,
        'viator_tags',1263,
        'events',0,
        'neighborhoods',18
      ),
      'source_readiness', jsonb_build_object(
        'viator','active sandbox Basic Access',
        'foursquare_os','pending Places Portal/dataset access',
        'foursquare_api','pending credential',
        'google_places','pending credential',
        'yelp','pending credential',
        'opentable','pending partner/API access',
        'ticketmaster','pending credential in Supabase',
        'seatgeek','pending credential/affiliate setup',
        'vivid_seats','affiliate/deep-link strategy; no consumer feed configured',
        'visit_music_city','pending licensed feed/partnership'
      ),
      'source_hierarchy', jsonb_build_array(
        jsonb_build_object('source','Nashroam Editorial','role','recommendation quality, local context, traveler fit, planner priority','storage','permanent first-party IP'),
        jsonb_build_object('source','Manual Verification','role','human verification and exception handling','storage','permanent'),
        jsonb_build_object('source','Official business/venue sources','role','authoritative durable/operational facts','cadence','priority-driven'),
        jsonb_build_object('source','Foursquare OS Places','role','durable POI backbone','storage','permanent when access configured','cadence','release/delta cadence'),
        jsonb_build_object('source','Google Places','role','just-in-time operational validation','storage','durable Place ID only; volatile provider state not permanent','cadence','shortlist/final-candidate checks'),
        jsonb_build_object('source','Yelp','role','consumer sentiment/review-count layer where licensed','storage','short-lived provider state','cadence','daily when enabled'),
        jsonb_build_object('source','OpenTable','role','restaurant availability/deep links','storage','on-demand','cadence','planner-time'),
        jsonb_build_object('source','Viator','role','experiences catalog, provider metadata, price, schedules, exact affiliate URLs','storage','canonical identity + expiring state','cadence','catalog every 6 hours; tags/destinations weekly; availability on demand'),
        jsonb_build_object('source','Ticketmaster','role','primary concert/sports/event feed','storage','canonical event + expiring source state','cadence','every few hours when enabled'),
        jsonb_build_object('source','SeatGeek','role','secondary event/ticket source','storage','deduped provider link/state','cadence','every few hours when enabled'),
        jsonb_build_object('source','Vivid Seats','role','secondary ticket marketplace/affiliate link','storage','partner IDs/URLs only unless formal feed approved','cadence','on-demand/deep-link'),
        jsonb_build_object('source','NCVC/direct calendars','role','local festivals/community/context','storage','canonical event facts','cadence','daily when enabled')
      ),
      'active_automation', jsonb_build_array(
        jsonb_build_object('job','nashroam-viator-products','cron','17 */6 * * *','action','up to 150 Nashville products using DEFAULT ranking','timeout_ms',60000),
        jsonb_build_object('job','nashroam-viator-tags','cron','35 8 * * 0','action','weekly Viator tag taxonomy refresh','timeout_ms',30000),
        jsonb_build_object('job','nashroam-viator-destinations','cron','50 8 * * 0','action','weekly Viator destination refresh','timeout_ms',30000)
      ),
      'curation_rule','Provider ingestion may normalize, classify, flag and prioritize records for review. It may not approve, publish, write Nashroam editorial copy, or populate nashroam_score.',
      'planner_rule','Planner never invents a place, event, experience or operational fact. Final recommendations must resolve to eligible Supabase IDs and pass freshness/confidence checks.',
      'conflict_rule','Provider disagreement creates or updates verification_queue; humans work exceptions instead of manually auditing the whole catalog.',
      'priority_tiers', jsonb_build_object(
        'tier_a','~150 high-frequency places: daily operational refresh + just-in-time validation',
        'tier_b','~300 secondary recommendations: every 2-3 days',
        'tier_c','long tail: weekly or when entering an itinerary candidate set'
      ),
      'security_rule','Private provider credentials remain server-side. Cron-to-Edge authentication uses a private Supabase Vault secret. Application tables remain private-by-default behind RLS/service-side access.',
      'monetization_rule','Affiliate economics never silently override editorial ranking. Sponsored/commercial treatment must remain distinct from Nashroam editorial score.'
    ),
    notes = 'Live source strategy plus maintenance/curation operating model. Keep aligned with docs/data-platform/README.md.',
    updated_at = now()
where document_key='data_refresh_strategy';
