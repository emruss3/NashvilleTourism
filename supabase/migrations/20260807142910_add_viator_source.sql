insert into public.data_sources (
  provider_key, name, source_type, base_url, terms_url,
  attribution_required, attribution_text, default_ttl_minutes,
  can_display_rating, can_display_reviews, can_store_raw, active, notes
)
values (
  'viator',
  'Viator Partner API',
  'other',
  'https://api.viator.com/partner',
  'https://docs.viator.com/partner-api/',
  true,
  'Viator',
  1440,
  true,
  true,
  true,
  false,
  'Partner API credential added to Supabase; inactive until authenticated access is verified. Preserve returned productUrl exactly for affiliate attribution and protect Viator Unique Content from search indexing.'
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
