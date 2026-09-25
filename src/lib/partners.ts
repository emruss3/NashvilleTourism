/**
 * Commercial partner configuration.
 *
 * Hotels book through the Nuitée white-label site (src/lib/stay-links.ts,
 * docs/HOTEL-BOOKING.md); every hotel surface uses hotelBookingHref() from
 * src/lib/hotel-booking.ts. Tickets and rentals still use affiliate deep
 * links here. Tours no longer construct Viator.com URLs — live inventory and
 * productUrl attribution come from Supabase Edge Functions (VIATOR_API_KEY
 * lives in Supabase secrets, not Vercel).
 */

import { STAY_MERCHANT, STAY_PARTNER, stayHost } from './stay-links';

const env = (k: string) => process.env[k] || '';

export const partners = {
  stay: {
    name: STAY_PARTNER,
    /** Merchant of record on the booking site; appears on the card statement. */
    merchant: STAY_MERCHANT,
    /** White-label host, or undefined when hotel CTAs must fall back to search links. */
    get host() {
      return stayHost();
    },
  },

  tours: {
    name: 'Viator',
    /**
     * NashRoam marketplace path. Prefer productUrl from the Partner API for
     * actual booking CTAs (includes affiliate + white-label domain).
     * Never read VIATOR_API_KEY here — it is server-only.
     */
    marketplacePath(params: { query?: string; date?: string } = {}) {
      const u = new URL('/tours/', 'https://www.nashroam.com');
      if (params.query) u.searchParams.set('q', params.query);
      if (params.date) u.searchParams.set('date', params.date);
      return `${u.pathname}${u.search}`;
    },
  },

  tickets: {
    name: 'Ticketmaster',
    affiliateId: env('NEXT_PUBLIC_TM_AFFILIATE'),
    /** Concert and event ticket search. */
    build(params: { query?: string; date?: string }) {
      const u = new URL('https://www.ticketmaster.com/search');
      u.searchParams.set('q', params.query ? `${params.query} Nashville` : 'Nashville');
      if (params.date) u.searchParams.set('startDate', params.date);
      const aff = env('NEXT_PUBLIC_TM_AFFILIATE');
      if (aff) u.searchParams.set('irgwc', aff);
      return u.toString();
    },
  },

  rentals: {
    name: 'Vrbo',
    affiliateId: env('NEXT_PUBLIC_VRBO_AID'),
    /** Whole-home rentals, which is what most large groups actually want. */
    build(params: { checkin?: string; checkout?: string; adults?: number }) {
      const u = new URL('https://www.vrbo.com/search');
      u.searchParams.set('q', 'Nashville, Tennessee');
      if (params.checkin) u.searchParams.set('startDate', params.checkin);
      if (params.checkout) u.searchParams.set('endDate', params.checkout);
      if (params.adults) u.searchParams.set('adults', String(params.adults));
      return u.toString();
    },
  },
} as const;

export type PartnerKey = keyof typeof partners;

/** True when at least one public affiliate ID is configured. */
export const HAS_AFFILIATE_IDS = Boolean(partners.tickets.affiliateId || partners.rentals.affiliateId);
