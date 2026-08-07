-- Allow affiliate provider source types, then seed Viator + Booking.com Demand.

alter table public.data_sources
  drop constraint if exists data_sources_type_check;

alter table public.data_sources
  add constraint data_sources_type_check check (
    source_type in (
      'editorial',
      'places',
      'reviews',
      'reservations',
      'tickets',
      'events',
      'official',
      'manual',
      'affiliate',
      'other'
    )
  );

insert into public.data_sources (
  provider_key, name, source_type, active, attribution_required, can_display_rating, can_display_reviews, can_store_raw, default_ttl_minutes, notes
) values
  (
    'viator',
    'Viator Partner API v2',
    'affiliate',
    true,
    true,
    true,
    false,
    false,
    60,
    'Nashville destination 799. Use productUrl exactly for booking CTAs. Do not store protected review text or unique content in HTML. Search/product cache ≤ 1 hour.'
  ),
  (
    'booking_demand',
    'Booking.com Demand API',
    'affiliate',
    false,
    true,
    true,
    false,
    false,
    60,
    'Hotel inventory source when credentials are issued. Not Viator. Sample /hotels catalog is not production inventory.'
  ),
  (
    'google_places',
    'Google Places',
    'places',
    false,
    true,
    true,
    false,
    false,
    10080,
    'Supplemental place verification/maps/hours/ratings only — never the hotel booking inventory source.'
  )
on conflict (provider_key) do update set
  name = excluded.name,
  source_type = excluded.source_type,
  active = excluded.active,
  attribution_required = excluded.attribution_required,
  can_display_rating = excluded.can_display_rating,
  can_display_reviews = excluded.can_display_reviews,
  can_store_raw = excluded.can_store_raw,
  default_ttl_minutes = excluded.default_ttl_minutes,
  notes = excluded.notes,
  updated_at = now();
