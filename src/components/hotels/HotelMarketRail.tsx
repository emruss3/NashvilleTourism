import Link from 'next/link';
import { AffiliateDisclosure } from '@/components/Trust';
import HotelMarketCard from '@/components/hotels/HotelMarketCard';
import MarketViewBeacon from '@/components/hotels/MarketViewBeacon';
import { hotels } from '@/lib/content';
import { rankMarketplace, type RankOptions } from '@/lib/feeds/hotel-marketplace-rank';
import { getAreaRates, type AreaRatesParams, type LiveRatesResult } from '@/lib/feeds/hotels-live';
import { partners } from '@/lib/partners';
import { stayDatesLabel } from '@/lib/stay-dates';

export interface HotelMarketRailProps {
  /** Either a search to run or a result already fetched by the page. */
  search?: AreaRatesParams;
  result?: LiveRatesResult;
  rank?: RankOptions;
  checkin: string;
  checkout: string;
  adults?: number;
  /** For clientReference and analytics: `market`, `hub`, `hood`. */
  surface: string;
  areaKey: string;
  title: string;
  /** Shown under the title with the count and dates filled in. */
  intro?: string;
  fromLabel?: string;
  headingLevel?: 'h2' | 'h3';
  /** Rendered (without partner branding) when the provider answered with nothing. Omit to render nothing. */
  emptyNote?: string;
  /** Extra controls (filter links) rendered between the intro and the grid. */
  controls?: React.ReactNode;
  className?: string;
  id?: string;
  /** Pass false on pages that already carry the stay disclosure above the rail. */
  disclosure?: boolean;
}

/**
 * A marketplace rail: live results for one area and one set of dates, ranked
 * by our rules with editorial hotels pinned first. Renders nothing at all
 * when the white label is not configured or the feed is unavailable, so no
 * page ever shows an empty partner-branded state.
 */
export default async function HotelMarketRail(props: HotelMarketRailProps) {
  if (!partners.stay.host) return null;
  const result = props.result ?? (props.search ? await getAreaRates(props.search) : undefined);
  if (!result?.live) return null;

  const editorialById = new Map(hotels.filter((h) => h.liteApiHotelId).map((h) => [h.liteApiHotelId!, h]));
  const ranked = rankMarketplace(result.rates, { pinnedIds: hotels.map((h) => h.liteApiHotelId).filter((id): id is string => Boolean(id)), ...props.rank });
  const Heading = props.headingLevel ?? 'h2';
  const datesLabel = stayDatesLabel({ checkin: props.checkin, checkout: props.checkout });

  if (!ranked.length && !props.emptyNote) return null;

  return (
    <section id={props.id} className={props.className ?? 'py-8'} aria-labelledby={`${props.surface}-${props.areaKey}-title`}>
      <MarketViewBeacon area={props.areaKey} count={ranked.length} cached={result.cached} surface={props.surface} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Live rates</p>
          <Heading id={`${props.surface}-${props.areaKey}-title`} className="mt-1 text-[1.5rem] sm:text-[1.75rem]">
            {props.title}
          </Heading>
          <p className="mt-1 max-w-prose text-[15px] text-ink-soft">
            {ranked.length ? `${ranked.length} ${ranked.length === 1 ? 'place' : 'places'} with a rate for ${datesLabel}.` : `No rates came back for ${datesLabel}.`}
            {props.intro ? ` ${props.intro}` : ''}
          </p>
        </div>
        <Link href="/hotels/#stays" className="inline-flex min-h-11 items-center text-[15px] font-semibold text-ink underline-offset-[0.2em] hover:underline">
          Change dates or area
        </Link>
      </div>
      {props.controls ? <div className="mt-3">{props.controls}</div> : null}
      {ranked.length ? (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ranked.map((item) => (
            <li key={item.rate.hotelId}>
              <HotelMarketCard
                item={item}
                checkin={props.checkin}
                checkout={props.checkout}
                adults={props.adults}
                surface={props.surface}
                editorialSlug={editorialById.get(item.rate.hotelId)?.slug}
                canDisplayRating={result.canDisplayRating}
                fromLabel={props.fromLabel}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 max-w-prose text-[15px] text-ink-soft">{props.emptyNote}</p>
      )}
      <p className="mt-4 max-w-prose text-2xs text-ink-soft">
        {result.attribution ?? 'Hotel names, photos, ratings and live rates supplied by LiteAPI (Nuitée).'} Marketplace listings are provider inventory, not NSVL recommendations, except where marked “Our pick”. Order is set by NSVL: our picks first, then distance, guest rating, star rating and price fit for the area.
      </p>
      {props.disclosure === false ? null : (
        <div className="mt-3">
          <AffiliateDisclosure compact variant="stay" />
        </div>
      )}
    </section>
  );
}
