/**
 * Commercial partner configuration.
 *
 * Every booking surface builds its deep link here so affiliate IDs live in one
 * place and can be swapped without touching components. IDs come from
 * environment variables; when one is absent the link still works, it just
 * carries no attribution, which is preferable to a broken or fake link.
 */

const env = (k: string) => process.env[k] || '';

export const partners = {
  hotels: {
    name: 'Booking.com',
    affiliateId: env('NEXT_PUBLIC_BOOKING_AID'),
    /** Nashville city search with dates and occupancy. */
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
    affiliateId: env('NEXT_PUBLIC_VIATOR_PID'),
    /** Party buses, pedal taverns, and guided tours. */
    build(params: { query?: string; date?: string }) {
      const u = new URL('https://www.viator.com/Nashville/d22104-ttd');
      if (params.query) u.searchParams.set('text', params.query);
      if (params.date) u.searchParams.set('date', params.date);
      const pid = env('NEXT_PUBLIC_VIATOR_PID');
      if (pid) u.searchParams.set('pid', pid);
      return u.toString();
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

/** True when at least one affiliate ID is configured. */
export const HAS_AFFILIATE_IDS = Object.values(partners).some((p) => Boolean(p.affiliateId));
