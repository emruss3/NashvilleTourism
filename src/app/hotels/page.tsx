import Link from 'next/link';
import BookingLink from '@/components/BookingLink';
import { BuildingIcon, CheckIcon, ForkIcon, PoolIcon, SparkleIcon, WalkIcon, WifiIcon } from '@/components/Icons';
import { ContentImage, SmartImage } from '@/components/Media';
import SaveButton from '@/components/SaveButton';
import { AffiliateDisclosure, HowWeChooseCallout } from '@/components/Trust';
import { Breadcrumbs, JsonLd } from '@/components/Ui';
import StaySearch from '@/components/hotels/StaySearch';
import PageIntro from '@/components/hub/PageIntro';
import SectionHead from '@/components/hub/SectionHead';
import { ANALYTICS_EVENTS } from '@/lib/analytics';
import { guides, hotels, neighborhoods } from '@/lib/content';
import { neighborhoodName } from '@/lib/content/neighborhoods';
import { neighborhoodImageKey } from '@/lib/media-placements';
import { buildMetadata, isIndexableRecord, itemListSchema } from '@/lib/seo';
import type { Hotel } from '@/lib/types';

type Params = Record<string, string | string[] | undefined>;

function one(params: Params, key: string): string | undefined {
  const raw = params[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.trim() || undefined;
}

export async function generateMetadata(props: { searchParams?: Promise<Params> }) {
  const params = (await props.searchParams) ?? {};
  return buildMetadata({
    // Deliberately distinct from the /guides/where-to-stay-nashville/ title so the
    // index and the guide do not compete for the same query.
    title: 'Nashville Hotels by Neighborhood',
    description:
      'Nashville hotels by neighborhood with honest notes on walkability, noise and who each area suits. Check rates with your dates; independent recommendations.',
    path: '/hotels/',
    noindex: Boolean(one(params, 'neighborhood')),
  });
}

function amenityIcon(label: string) {
  const t = label.toLowerCase();
  if (/pool/.test(t)) return <PoolIcon size={16} />;
  if (/spa|wellness/.test(t)) return <SparkleIcon size={16} />;
  if (/fitness|gym/.test(t)) return <WalkIcon size={16} />;
  if (/dining|food|breakfast|coffee|bar/.test(t)) return <ForkIcon size={16} />;
  if (/rooftop|room|meeting|studio|venue/.test(t)) return <BuildingIcon size={16} />;
  if (/wi-?fi/.test(t)) return <WifiIcon size={16} />;
  return <CheckIcon size={16} />;
}

/**
 * Hotels: an editorial shortlist (page-designs/README.md §06).
 * Restrained property photograph beside the stay search, a numbered
 * neighborhood rail, wide hotel rows with substantial photography where the
 * exact property is cleared, then the guide hand-off. Without a live-rate
 * provider every row says "Check rates" and opens the property on
 * Booking.com; no nightly price is shown.
 */
export default async function HotelsIndex(props: { searchParams?: Promise<Params> }) {
  const params = (await props.searchParams) ?? {};
  const hoodParam = one(params, 'neighborhood');
  const hood = neighborhoods.some((n) => n.slug === hoodParam) ? hoodParam : undefined;

  const rail = neighborhoods.filter((n) => hotels.some((h) => h.neighborhood === n.slug));
  const rows = hotels.filter((h) => !hood || h.neighborhood === hood).sort((a, b) => Number(Boolean(b.image)) - Number(Boolean(a.image)));
  const hotelGuides = guides.filter((g) => g.cluster === 'Hotels');

  return (
    <>
      <JsonLd
        data={itemListSchema(
          hotels.filter(isIndexableRecord).map((x) => ({ name: x.title, url: `/hotels/${x.slug}/`, description: x.summary })),
          'Nashville Hotels',
        )}
      />
      <div className="shell">
        <Breadcrumbs trail={[{ name: 'Hotels', href: '/hotels/' }]} />
      </div>

      <PageIntro
        eyebrow="Hotels"
        title={
          <>
            Stay
            <br />
            somewhere good.
          </>
        }
        support="Find the right base for your Nashville trip. Great rooms. Better neighborhoods."
        media={
          <div className="overflow-hidden rounded-card bg-ink">
            <SmartImage imageKey="hotels/1-hotel-nashville" ratio="aspect-[16/10] lg:aspect-auto lg:h-[440px]" sizes="(max-width: 1023px) 100vw, 58vw" priority />
          </div>
        }
      >
        <StaySearch neighborhoods={rail.map((n) => ({ value: n.slug, label: n.name }))} initialNeighborhood={hood} />
      </PageIntro>

      <section className="border-y border-paper-edge" aria-labelledby="rail-title">
        <div className="shell flex flex-col gap-3 py-3 lg:flex-row lg:items-center lg:gap-6">
          <h2 id="rail-title" className="shrink-0 font-sans text-[15px] font-bold lg:w-36">
            Choose your neighborhood
          </h2>
          <ol className="flex gap-2 overflow-x-auto pb-1 lg:flex-1 lg:gap-4">
            {rail.map((n, i) => (
              <li key={n.slug} className="shrink-0">
                <Link
                  href={hood === n.slug ? '/hotels/#stays' : `/hotels/?neighborhood=${n.slug}#stays`}
                  aria-current={hood === n.slug ? 'true' : undefined}
                  className={`group flex min-h-12 items-center gap-3 rounded-card border px-2 py-1 pr-3 ${hood === n.slug ? 'border-ink bg-paper-sunk' : 'border-transparent hover:border-paper-edge'}`}
                >
                  <span className="w-14 overflow-hidden rounded-card bg-ink">
                    <SmartImage imageKey={neighborhoodImageKey(n.slug)} ratio="aspect-[4/3]" sizes="56px" />
                  </span>
                  <span>
                    <span className="block text-2xs font-semibold uppercase tracking-[0.14em] text-ink-soft">{String(i + 1).padStart(2, '0')}</span>
                    <span className="block text-[15px] font-semibold leading-tight text-ink">{n.name}</span>
                    <span className="block text-2xs text-ink-soft">{n.typicalHotelPrice} · {n.walkability.split('.')[0]}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
          <Link href="/where-to-stay/" className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-[15px] font-semibold text-ink underline-offset-[0.2em] hover:underline">
            Compare areas <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <section id="stays" className="shell section scroll-mt-20" aria-labelledby="stays-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">{hood ? neighborhoodName(hood) : 'Our shortlist'}</p>
            <h2 id="stays-title" className="mt-1 text-[1.625rem] sm:text-[2rem]">
              {rows.length} {rows.length === 1 ? 'hotel' : 'hotels'}
              {hood ? <span className="font-normal text-ink-soft"> in {neighborhoodName(hood)}</span> : <span className="font-normal text-ink-soft"> we would send a friend to</span>}
            </h2>
          </div>
          {hood ? (
            <Link href="/hotels/#stays" className="inline-flex min-h-11 items-center text-[15px] font-semibold text-ink underline-offset-[0.2em] hover:underline">
              All neighborhoods
            </Link>
          ) : null}
        </div>
        <div className="mt-3">
          <AffiliateDisclosure compact />
        </div>

        <ul className="mt-4 divide-y divide-paper-edge border-y border-paper-edge">
          {rows.map((h) => (
            <li key={h.slug}>
              <HotelRow hotel={h} />
            </li>
          ))}
        </ul>
        <p className="mt-3 text-2xs text-ink-soft">
          Amenities are as listed by each property and re-checked periodically. Nightly rates, taxes and fees appear on Booking.com for your dates.
        </p>
      </section>

      <section className="border-y border-paper-edge bg-paper-sunk" aria-labelledby="guide-title">
        <div className="shell section grid gap-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-12">
          <div>
            <p className="eyebrow">The NSVL guide</p>
            <h2 id="guide-title" className="mt-1 text-[2rem] sm:text-[2.5rem] lg:text-[3rem]">
              Wake up here.
            </h2>
            <p className="mt-3 max-w-sm text-[16px] text-ink-soft">
              From morning coffee to late-night music, the right base puts more of Nashville within reach. Compare areas, read the stay guides, then plan from your hotel.
            </p>
            {hotelGuides.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {hotelGuides.map((g) => (
                  <li key={g.slug}>
                    <Link href={`/guides/${g.slug}/`} className="inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-ink underline-offset-[0.2em] hover:underline">
                      {g.title} <span aria-hidden="true">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              { eyebrow: 'Hotel situations', title: 'More than a stay.', body: 'Boutique downtown, group rentals, pools, value in Midtown: six routes to the right room.', href: '/where-to-stay/', image: 'stay/boutique-hotels-downtown' as const },
              { eyebrow: 'Plan from this stay', title: 'Build the trip around your hotel.', body: 'Tell the planner where you are sleeping and it keeps the days close to home.', href: '/plan/', image: 'stay/walkable-to-broadway' as const },
            ].map((tile) => (
              <li key={tile.href}>
                <Link href={tile.href} className="group relative block overflow-hidden rounded-card bg-ink text-paper">
                  <SmartImage imageKey={tile.image} ratio="aspect-[16/10]" sizes="(max-width: 639px) 100vw, 33vw" />
                  <span className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/30 to-transparent" aria-hidden="true" />
                  <span className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                    <span className="block text-2xs font-semibold uppercase tracking-[0.14em] text-paper/80">{tile.eyebrow}</span>
                    <span className="mt-0.5 block font-display text-[1.375rem] font-extrabold leading-tight tracking-[-0.03em] sm:text-[1.5rem]">{tile.title}</span>
                    <span className="mt-0.5 block text-sm text-paper/85">{tile.body}</span>
                    <span className="mt-1 block text-[15px] font-semibold underline-offset-[0.2em] group-hover:underline">
                      Open <span aria-hidden="true">→</span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="shell py-10">
        <HowWeChooseCallout />
      </div>
    </>
  );
}

function HotelRow({ hotel }: { hotel: Hotel }) {
  return (
    <article className={`grid gap-4 py-5 ${hotel.image ? 'md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-8' : ''}`}>
      {hotel.image ? (
        <div className="overflow-hidden rounded-card bg-ink">
          <ContentImage image={hotel.image} ratio="aspect-[16/10] md:aspect-[4/3]" sizes="(max-width: 767px) 100vw, 40vw" />
        </div>
      ) : null}
      <div className="flex flex-col">
        <p className="eyebrow">
          {neighborhoodName(hotel.neighborhood)} · {hotel.priceCategory}
        </p>
        <h3 className="mt-1 text-[1.5rem] sm:text-[1.75rem]">{hotel.title}</h3>
        <p className="mt-2 max-w-prose text-[16px] leading-relaxed text-ink">{hotel.summary}</p>
        <p className="mt-1 max-w-prose text-[15px] text-ink-soft">{hotel.whyWeRecommend}</p>
        {hotel.amenities.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
            {hotel.amenities.slice(0, 4).map((a) => (
              <li key={a} className="inline-flex items-center gap-1.5 text-sm text-ink-soft">
                <span className="text-ink" aria-hidden="true">
                  {amenityIcon(a)}
                </span>
                {a}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-3 md:mt-auto md:pt-4">
          <BookingLink
            url={hotel.bookingUrl}
            label="Check rates"
            name={hotel.title}
            slug={hotel.slug}
            event={ANALYTICS_EVENTS.HOTEL_AFFILIATE_CLICKED}
            partner="Booking.com"
            placement="affiliate"
            className="min-h-11 px-5"
          />
          <Link href={`/hotels/${hotel.slug}/`} className="inline-flex min-h-11 items-center text-[15px] font-semibold text-ink underline-offset-[0.2em] hover:underline">
            View hotel details
          </Link>
          <SaveButton item={{ id: `hotel:${hotel.slug}`, kind: 'hotel', title: hotel.title, href: `/hotels/${hotel.slug}/`, meta: neighborhoodName(hotel.neighborhood) }} />
        </div>
      </div>
    </article>
  );
}
