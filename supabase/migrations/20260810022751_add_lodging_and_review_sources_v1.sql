insert into public.data_sources (
  provider_key, name, source_type, base_url, terms_url,
  attribution_required, attribution_text, default_ttl_minutes,
  can_display_rating, can_display_reviews, can_store_raw, active, notes
)
values
  (
    'tripadvisor', 'TripAdvisor Content API', 'reviews',
    'https://api.content.tripadvisor.com/', 'https://tripadvisor-content-api.readme.io/',
    true, 'Tripadvisor', 1440,
    true, false, false, false,
    'Supplemental ratings/review-count provider. Activate only with approved partner credentials and current display/license terms. Existing website adapter is transitional until this source is wired through Supabase.'
  ),
  (
    'booking_demand', 'Booking.com Demand API', 'other',
    'https://demandapi.booking.com/', 'https://developers.booking.com/demand/docs/getting-started/overview',
    true, 'Booking.com', 60,
    false, false, false, false,
    'Future live hotel inventory/rates/booking source. Repo adapter is scaffold-only; activate after server-side credentials and commercial terms are configured.'
  )
on conflict (provider_key) do update set
  name = excluded.name,
  source_type = excluded.source_type,
  base_url = excluded.base_url,
  terms_url = excluded.terms_url,
  attribution_required = excluded.attribution_required,
  attribution_text = excluded.attribution_text,
  default_ttl_minutes = excluded.default_ttl_minutes,
  can_display_rating = excluded.can_display_rating,
  can_display_reviews = excluded.can_display_reviews,
  can_store_raw = excluded.can_store_raw,
  notes = excluded.notes,
  updated_at = now();
