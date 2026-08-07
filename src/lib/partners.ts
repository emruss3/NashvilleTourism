/**
 * Commercial partner configuration.
 *
 * Hotels / tickets / rentals still use affiliate deep links here.
 * Tours no longer construct Viator.com URLs with NEXT_PUBLIC_VIATOR_PID —
 * live inventory and productUrl attribution come from the server-side
 * Viator Partner API v2 (`VIATOR_API_KEY` → src/lib/feeds/viator.ts).
 */

const env = (k: string) => process.env[k] || '';

export const partners = {
  hotels: {
    name: 'Booking.com',
    affiliateId: env('NEXT_PUBLIC_BOOKING_AID'),
    /**
     * City search fallback until Booking.com Demand API credentials power
     * live inventory (see src/lib/feeds/booking-demand.ts).
     */
    build(params: { checkin?: string; checkout?: string; adults?: number; area?: string }) {
      const u = new URL('https://www.booking.com/searchresults.html');
      u.searchParams.set('ss', params.area ? `${params.area}, Nashville, Tennessee` : 'Nashville, Tennessee');
      if (params.checkin) u.searchParams.set('checkin', params.checkin);
      if (params.checkout) u.searchParams.set('checkout', params.checkout);
      if (params.adults) u.searchParams.set('group_adults', String(params.adults));
      const aid = env('NEXT_PUBLIC_BOOKING_AID');
      if (aid) u.searchParams.set('aid', aid);
      return u.toString();
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
export const HAS_AFFILIATE_IDS = Boolean(
  partners.hotels.affiliateId || partners.tickets.affiliateId || partners.rentals.affiliateId,
);
