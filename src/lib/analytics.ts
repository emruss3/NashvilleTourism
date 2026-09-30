/**
 * Analytics event contract.
 *
 * Events are defined once here so naming stays consistent and so the set is
 * documentable. `track()` pushes to a dataLayer if one exists and otherwise
 * no-ops, which keeps the site free of a hard vendor dependency. Wire this to
 * GA4, Plausible, or Segment at the `dispatch` call site only.
 */

export const ANALYTICS_EVENTS = {
  DISCOVERY_SUBMITTED: 'discovery_submit',
  SEARCH_SUBMITTED: 'search_submitted',
  SEARCH_RESULT_CLICKED: 'search_result_clicked',
  TRIP_PLANNER_STARTED: 'trip_planner_started',
  TRIP_PLANNER_COMPLETED: 'trip_planner_completed',
  ITINERARY_SAVED: 'itinerary_saved',
  ITEM_SAVED: 'item_saved',
  ITINERARY_EMAILED: 'itinerary_emailed',
  HOTEL_AFFILIATE_CLICKED: 'hotel_affiliate_clicked',
  HOTEL_MARKET_VIEWED: 'hotel_market_viewed',
  /** Room list rendered for one hotel (result_count, cached) and a room's own CTA clicked (room_name, board, refundable). */
  HOTEL_ROOMS_VIEWED: 'hotel_rooms_viewed',
  HOTEL_ROOM_CLICKED: 'hotel_room_clicked',
  TICKET_AFFILIATE_CLICKED: 'ticket_affiliate_clicked',
  ACTIVITY_AFFILIATE_CLICKED: 'activity_affiliate_clicked',
  RESTAURANT_RESERVATION_CLICKED: 'restaurant_reservation_clicked',
  NEWSLETTER_SIGNUP: 'newsletter_signup',
  EVENT_INQUIRY_SUBMITTED: 'event_inquiry_submitted',
  /** Private events marketplace (docs/PRIVATE-EVENTS.md). */
  EVENTS_BRIEF_STARTED: 'events_brief_started',
  EVENTS_BRIEF_SENT: 'events_brief_sent',
  EVENTS_VENUE_VIEWED: 'events_venue_viewed',
  EVENTS_SHORTLIST_ADDED: 'events_shortlist_added',
  EVENTS_PACKAGE_CLICKED: 'events_package_clicked',
  SPONSOR_CLICKED: 'sponsor_clicked',
  MAP_OPENED: 'map_opened',
  PHONE_CLICKED: 'phone_clicked',
  GUIDE_SCROLLED_75: 'guide_scrolled_75',
  RELATED_CONTENT_CLICKED: 'related_content_clicked',
} as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export interface AnalyticsPayload {
  /** Slug or identifier of the content involved. */
  item_id?: string;
  item_name?: string;
  item_type?: string;
  neighborhood?: string;
  /** For commercial clickouts: which partner received the click. */
  partner?: string;
  placement?: 'editorial' | 'sponsored' | 'affiliate' | 'whitelabel';
  /** `nsh:{surface}:{slug}` carried on white-label links. */
  client_reference?: string;
  /** Provider hotel id on hotel clickouts. */
  hotel_id?: string;
  /** Nightly price shown next to the CTA, when one was. */
  nightly_shown?: number;
  search_term?: string;
  results_count?: number;
  /** Marketplace rails: how many results rendered and whether the cache answered. */
  result_count?: number;
  cached?: boolean;
  trip_type?: string;
  value?: number;
  /** Private events: how many venues a brief went to, and the planner's guest band. */
  venue_count?: number;
  occasion?: string;
  guests_band?: string;
  utm?: Record<string, string>;
  [key: string]: unknown;
}

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export function track(event: AnalyticsEvent, payload: AnalyticsPayload = {}): void {
  if (typeof window === 'undefined') return;
  const entry = { event, ...payload };
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(entry);
  if (process.env.NODE_ENV === 'development') {
    // Visible during local testing so events can be verified without a vendor.
    console.debug('[analytics]', entry);
  }
}
