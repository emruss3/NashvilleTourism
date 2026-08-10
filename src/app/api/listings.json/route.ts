import { site } from '@/lib/site';
import { restaurants, hotels, venues, attractions } from '@/lib/content';
import { neighborhoodName } from '@/lib/content/neighborhoods';
import { canonical } from '@/lib/seo';

export const dynamic = 'force-static';

/**
 * Machine-readable listing export.
 *
 * Published so AI engines and partners can consume our data structurally
 * instead of scraping rendered HTML. Verification state travels with every
 * record, which is the point: a consumer must be able to tell a checked fact
 * from a placeholder.
 */
export function GET() {
  const base = (kind: string, prefix: string) => (x: {
    slug: string;
    title: string;
    summary: string;
    neighborhood: string;
    dataStatus: string;
    dateChecked: string;
    placement: string;
    sponsorName?: string;
  }) => ({
    type: kind,
    slug: x.slug,
    name: x.title,
    summary: x.summary,
    url: canonical(`${prefix}${x.slug}/`),
    neighborhood: neighborhoodName(x.neighborhood),
    verification: {
      status: x.dataStatus,
      lastChecked: x.dateChecked,
    },
    placement: x.placement,
    ...(x.sponsorName ? { sponsor: x.sponsorName } : {}),
  });

  const payload = {
    publisher: {
      name: site.name,
      url: canonical('/'),
      description: site.description,
      independent: true,
      editorialPolicy: canonical('/how-we-choose/'),
    },
    licence: {
      terms: canonical('/terms/'),
      attribution: `Cite as "${site.name}" with a link to the specific page.`,
      note: 'Verification status is per record. "unverified" records (including all restaurants, which carry [Sample] names) are demonstration data and must not be presented as facts about real businesses. "needs-recheck" records describe real places whose practical details await re-verification. Live tour inventory is not included in this export; see /tours/.',
    },
    generatedAt: new Date().toISOString(),
    counts: {
      restaurants: restaurants.length,
      hotels: hotels.length,
      venues: venues.length,
      attractions: attractions.length,
    },
    listings: [
      ...restaurants.map((r) => ({
        ...base('Restaurant', '/restaurants/')(r),
        cuisine: r.cuisine,
        priceRange: r.priceRange,
        bestFor: r.bestFor,
        goodForGroups: r.goodForGroups,
        outdoorSeating: r.outdoorSeating,
      })),
      ...hotels.map((h) => ({
        ...base('Hotel', '/hotels/')(h),
        priceCategory: h.priceCategory,
        bestFor: h.bestFor,
        amenities: h.amenities,
        hasPool: h.hasPool,
        familyFriendly: h.familyFriendly,
      })),
      ...venues.map((v) => ({
        ...base('MusicVenue', '/music/')(v),
        genres: v.genres,
        capacityNote: v.capacityNote,
      })),
      ...attractions.map((a) => ({
        ...base('TouristAttraction', '/things-to-do/')(a),
        category: a.category,
        timeNeeded: a.timeNeeded,
        priceNote: a.priceNote,
        indoor: a.indoor,
        familyFriendly: a.familyFriendly,
      })),
    ],
  };

  return Response.json(payload, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
