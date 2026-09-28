-- Seed fixture: the three BPH Hospitality venues, unpublished, with TODO
-- placeholders wherever a human must supply the number. The publish check
-- refuses to publish anything that still says TODO, so these render only in
-- preview builds (VERCEL_ENV != production) until real content replaces them.
--
-- The venues are also added to public.places, unpublished and pending
-- curation, so they enter the same place_editorial workflow as every other
-- place; nothing here publishes them to /music or /restaurants.

insert into public.places (slug, name, neighborhood_id, primary_category, address_line1, city, state, postal_code, website_url, status, is_published, curation_status, curation_notes)
select v.slug, v.name, n.id, v.category, v.address, 'Nashville', 'TN', v.zip, v.website, 'active', false, 'pending', 'Added by the private events marketplace seed; needs human editorial before publishing.'
from (values
  ('jbjs-nashville', 'JBJ''s Nashville', 'downtown', 'venue', '405 Broadway', '37203', 'https://www.jasonaldean.com/jbjs/'),
  ('hank-williams-jr-boogie-bar', 'Hank Williams Jr.''s Boogie Bar', 'downtown', 'venue', 'TODO Lower Broadway address', '37203', null),
  ('playdate-nashville', 'Playdate', '12-south', 'restaurant', '2405 12th Ave S', '37204', 'https://www.playdatenash.com/')
) as v(slug, name, hood, category, address, zip, website)
join public.neighborhoods n on n.slug = v.hood
on conflict (slug) do nothing;

insert into public.event_venues (slug, name, kind, neighborhood_slug, address, lat, lng, summary, description, website, owned_by_bph, place_id, sales_contact_name, sales_contact_email, sales_contact_phone, lead_system, published, editorial_priority)
values
  (
    'jbjs-nashville', 'JBJ''s Nashville', 'music_venue', 'downtown-broadway', '405 Broadway, Nashville, TN 37203', 36.1611, -86.7768,
    'TODO: one-line summary of JBJ''s for planners (rooftop, stage, floors).',
    'TODO: human-written description of the venue and what it does well for groups.',
    'https://www.jasonaldean.com/jbjs/', true, (select id from public.places where slug = 'jbjs-nashville'),
    'TODO sales contact', 'TODO@example.com', null, 'email', false, 100
  ),
  (
    'hank-williams-jr-boogie-bar', 'Hank Williams Jr.''s Boogie Bar', 'bar', 'downtown-broadway', 'TODO Lower Broadway address, Nashville, TN 37203', 36.1607, -86.7772,
    'TODO: one-line summary of Hank''s for planners.',
    'TODO: human-written description.',
    null, true, (select id from public.places where slug = 'hank-williams-jr-boogie-bar'),
    'TODO sales contact', 'TODO@example.com', null, 'email', false, 90
  ),
  (
    'playdate-nashville', 'Playdate', 'restaurant', '12-south', '2405 12th Ave S, Nashville, TN 37204', 36.1265, -86.7893,
    'TODO: one-line summary of Playdate for planners (private dining, high tea for groups).',
    'TODO: human-written description.',
    'https://www.playdatenash.com/', true, (select id from public.places where slug = 'playdate-nashville'),
    'TODO sales contact', 'TODO@example.com', null, 'email', false, 80
  )
on conflict (slug) do nothing;

insert into public.event_spaces (venue_id, slug, name, summary, seated_capacity, standing_capacity, min_guests, pricing_model, min_spend_cents, pricing_note, av_included, outdoor, accessible, private_entrance, sort_order, published)
select v.id, s.slug, s.name, s.summary, 0, 0, null, s.model, null, 'TODO: pricing (minimum spend, room fee, per person or buyout) and what it includes.', false, s.outdoor, false, false, s.sort_order, false
from (values
  ('jbjs-nashville', 'rooftop', 'Rooftop', 'TODO: capacities and what the rooftop is like for a private group.', 'min_spend', true, 1),
  ('jbjs-nashville', 'full-buyout', 'Full buyout', 'TODO: whole-venue buyout for large receptions.', 'buyout', false, 2),
  ('hank-williams-jr-boogie-bar', 'upper-floor', 'Upper floor', 'TODO: semi-private floor for groups.', 'min_spend', false, 1),
  ('hank-williams-jr-boogie-bar', 'full-buyout', 'Full buyout', 'TODO: whole-venue buyout.', 'buyout', false, 2),
  ('playdate-nashville', 'private-dining-room', 'Private dining room', 'TODO: seated dinners and high tea for groups.', 'per_person', false, 1),
  ('playdate-nashville', 'full-buyout', 'Full buyout', 'TODO: whole-restaurant buyout.', 'buyout', false, 2)
) as s(venue_slug, slug, name, summary, model, outdoor, sort_order)
join public.event_venues v on v.slug = s.venue_slug
on conflict (venue_id, slug) do nothing;

-- Key dates for the next twelve months. Content, maintained by hand.
insert into public.event_key_dates (date, label, kind, source) values
  ('2026-12-31', 'New Year''s Eve', 'holiday', 'calendar'),
  ('2027-06-10', 'CMA Fest (opening day)', 'festival', 'cmafest.com, dates to confirm'),
  ('2026-11-26', 'Thanksgiving', 'holiday', 'calendar'),
  ('2026-12-24', 'Christmas Eve', 'holiday', 'calendar')
on conflict (date, label) do nothing;
