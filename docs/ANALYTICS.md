# Analytics events

All events are defined in `src/lib/analytics.ts`. Nothing is hardcoded at call
sites, so the set below is the complete contract.

`track()` pushes to `window.dataLayer`. Wire that to GA4, Plausible, or Segment
in `src/app/layout.tsx`. Until a provider is connected, events are logged to the
console in development and dropped in production.

## Event reference

| Event | Fires when | Key payload |
|---|---|---|
| `search_submitted` | Search form submitted, or `/search/` loaded with `?q=` | `search_term`, `results_count` |
| `search_result_clicked` | A result is opened from the type-ahead or results list | `search_term`, `item_id`, `item_type` |
| `trip_planner_started` | First interaction with any planner field | `trip_type` |
| `trip_planner_completed` | Itinerary built | `trip_type`, `value` (days) |
| `itinerary_saved` | "Save itinerary" pressed | `trip_type`, `value` |
| `itinerary_emailed` | "Email it to me" pressed | `trip_type`, `value` |
| `hotel_affiliate_clicked` | Hotel booking clickout | `item_id`, `partner`, `placement` |
| `ticket_affiliate_clicked` | Event ticket clickout | `item_id`, `partner`, `placement` |
| `activity_affiliate_clicked` | Activity or tour clickout | `item_id`, `partner`, `placement` |
| `restaurant_reservation_clicked` | Reservation clickout | `item_id`, `partner` |
| `newsletter_signup` | Newsletter form submitted | `item_id` (form location) |
| `sponsor_clicked` | A sponsored placement is clicked | `item_id`, `partner` |
| `map_opened` | A map link is opened | `item_id` |
| `phone_clicked` | A telephone link is opened | `item_id` |
| `guide_scrolled_75` | Reader passes 75% of a guide, once per view | `item_id` |
| `related_content_clicked` | A related-content link is followed | `item_id`, `item_type` |

## Conventions

- Event names are `snake_case` and past tense.
- `item_id` is always the content slug.
- `placement` is `editorial`, `sponsored`, or `affiliate`. Every commercial
  clickout must send it so revenue can be attributed without guessing.
- Commercial clickouts also carry `rel="sponsored"` on the anchor.

## Not yet wired

- `sponsor_clicked` and `phone_clicked` are defined but have no call site,
  because no sponsor units or phone numbers are in the seed content.
- `activity_affiliate_clicked` is defined and available to `BookingLink`, but
  attractions have no booking URLs in the seed data.
