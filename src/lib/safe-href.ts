/**
 * Only http(s) URLs may become clickable links.
 *
 * Provider and open-dataset records (Overture, Foursquare, Ticketmaster) supply
 * website fields verbatim, and nothing upstream constrains the scheme. A
 * `javascript:` value rendered as an href inside the authenticated admin
 * origin would run with the admin session, so anything else is dropped.
 */
export function safeExternalHref(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : undefined;
}
