import Link from 'next/link';
import { Breadcrumbs } from '@/components/Ui';
import { AffiliateDisclosure } from '@/components/Trust';
import BookingLink from '@/components/BookingLink';
import { ANALYTICS_EVENTS } from '@/lib/analytics';
import { getTourProduct } from '@/lib/feeds/tours';
import { buildMetadata, canonical } from '@/lib/seo';

export const revalidate = 3600;

function unitLabel(unitType?: string): string | undefined {
  if (!unitType) return undefined;
  const labels: Record<string, string> = {
    GROUP: 'per group',
    VEHICLE: 'per vehicle',
    BOAT: 'per boat',
    BIKE: 'per bike',
    ROOM: 'per room',
    PACKAGE: 'per package',
    AIRCRAFT: 'per aircraft',
  };
  return labels[unitType] ?? `per ${unitType.toLowerCase().replaceAll('_', ' ')}`;
}

export async function generateMetadata({ params }: { params: { productCode: string } }) {
  const code = decodeURIComponent(params.productCode);
  const { product } = await getTourProduct(code);
  if (!product) {
    return buildMetadata({
      title: 'Tour not found',
      description: 'This Nashville experience is not currently available on NashRoam.',
      path: `/tours/${encodeURIComponent(code)}/`,
      noindex: true,
    });
  }
  return buildMetadata({
    title: product.title,
    description: product.description?.slice(0, 155) || `Book ${product.title} in Nashville via Viator.`,
    path: `/tours/${encodeURIComponent(product.productCode)}/`,
    noindex: true,
  });
}

export default async function TourProductPage({ params }: { params: { productCode: string } }) {
  const code = decodeURIComponent(params.productCode);
  const { product, live, error, attribution } = await getTourProduct(code);

  if (!live || !product) {
    return (
      <div className="shell pb-16">
        <Breadcrumbs
          trail={[
            { name: 'Tours', href: '/tours/' },
            { name: 'Unavailable', href: canonical(`/tours/${encodeURIComponent(code)}/`) },
          ]}
        />
        <h1 className="mt-6 font-display text-3xl font-bold text-navy">Experience unavailable</h1>
        <p className="mt-3 max-w-prose text-ink-soft">
          {error || 'This experience could not be loaded from Viator right now.'}
        </p>
        <Link href="/tours/" className="btn-primary mt-6 inline-flex min-h-[44px]">
          Back to tours
        </Link>
      </div>
    );
  }

  const priceBasis =
    product.pricingType === 'PER_PERSON'
      ? 'per person'
      : product.pricingType === 'UNIT'
        ? unitLabel(product.unitType) || 'per unit'
        : undefined;
  const travelerRange =
    product.minTravelers != null || product.maxTravelers != null
      ? `${product.minTravelers ?? 1}${product.maxTravelers != null ? `–${product.maxTravelers}` : '+'} travelers per booking`
      : undefined;

  return (
    <div className="shell pb-16">
      <Breadcrumbs
        trail={[
          { name: 'Tours', href: '/tours/' },
          { name: product.title, href: `/tours/${encodeURIComponent(product.productCode)}/` },
        ]}
      />

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div>
          <p className="eyebrow">Live Viator experience</p>
          <h1 className="mt-2 font-display text-3xl font-bold leading-tight text-navy md:text-4xl">
            {product.title}
          </h1>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-ink-soft">
            {product.rating != null ? (
              <p>
                <span className="font-semibold text-navy">{product.rating.toFixed(1)}</span>
                {product.reviewCount != null
                  ? ` · ${product.reviewCount.toLocaleString()} reviews on Viator`
                  : ' · Viator rating'}
              </p>
            ) : null}
            {product.durationLabel ? <p>{product.durationLabel}</p> : null}
            {product.freeCancellation ? (
              <p className="font-semibold text-navy">Free cancellation</p>
            ) : null}
            {product.privateTour ? <p className="font-semibold text-navy">Private tour</p> : null}
          </div>

          {product.categories?.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {product.categories.map((category) => (
                <span key={category} className="rounded-full bg-sky/60 px-3 py-1 text-xs font-semibold text-ink-soft">
                  {category}
                </span>
              ))}
            </div>
          ) : null}

          {product.imageUrl ? (
            <div className="mt-6 overflow-hidden rounded-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.imageUrl}
                alt=""
                className="aspect-[16/10] w-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : null}

          {product.description ? (
            <p className="mt-6 max-w-prose text-[15px] leading-relaxed text-ink-soft md:text-base">
              {product.description}
            </p>
          ) : null}

          {product.itineraryOverview ? (
            <div className="mt-8">
              <h2 className="font-sans text-xl font-bold text-navy">Experience overview</h2>
              <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-ink-soft">
                {product.itineraryOverview}
              </p>
            </div>
          ) : null}

          {product.inclusions?.length ? (
            <div className="mt-8">
              <h2 className="font-sans text-xl font-bold text-navy">What&apos;s included</h2>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-[15px] text-ink-soft">
                {product.inclusions.slice(0, 12).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {product.exclusions?.length ? (
            <div className="mt-8">
              <h2 className="font-sans text-xl font-bold text-navy">Not included</h2>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-[15px] text-ink-soft">
                {product.exclusions.slice(0, 12).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {product.additionalInfo?.length ? (
            <div className="mt-8">
              <h2 className="font-sans text-xl font-bold text-navy">Good to know</h2>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-[15px] text-ink-soft">
                {product.additionalInfo.slice(0, 10).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <aside className="h-fit rounded-card border border-paper-edge bg-paper-card p-6 shadow-card lg:sticky lg:top-24">
          {product.fromPrice ? (
            <div>
              <p className="text-2xs font-bold uppercase tracking-wider text-ink-faint">Starting from</p>
              <p className="mt-1 text-2xl font-bold text-navy">
                {product.fromPrice.formatted}
                {priceBasis ? <span className="ml-2 text-sm font-medium text-ink-faint">{priceBasis}</span> : null}
              </p>
            </div>
          ) : (
            <p className="text-lg font-semibold text-navy">See live price on Viator</p>
          )}

          <dl className="mt-5 space-y-3 border-t border-paper-edge pt-5 text-sm">
            {travelerRange ? (
              <div className="flex items-start justify-between gap-4">
                <dt className="font-semibold text-ink">Group size</dt>
                <dd className="text-right text-ink-soft">{travelerRange}</dd>
              </div>
            ) : null}
            {product.confirmationType ? (
              <div className="flex items-start justify-between gap-4">
                <dt className="font-semibold text-ink">Confirmation</dt>
                <dd className="text-right text-ink-soft">
                  {product.confirmationType === 'INSTANT' ? 'Instant' : product.confirmationType.replaceAll('_', ' ').toLowerCase()}
                </dd>
              </div>
            ) : null}
            {product.unitType && product.pricingType === 'UNIT' ? (
              <div className="flex items-start justify-between gap-4">
                <dt className="font-semibold text-ink">Price basis</dt>
                <dd className="text-right text-ink-soft">{unitLabel(product.unitType) || 'Per unit'}</dd>
              </div>
            ) : null}
          </dl>

          <p className="mt-5 text-sm leading-relaxed text-ink-soft">
            NashRoam shows Viator product information and a starting price. Exact date availability,
            start times, party-size pricing, and checkout are confirmed on Viator.
          </p>
          <div className="mt-5">
            <BookingLink
              url={product.productUrl}
              label="Check dates & prices on Viator"
              name={product.title}
              slug={product.productCode}
              event={ANALYTICS_EVENTS.ACTIVITY_AFFILIATE_CLICKED}
              partner="Viator"
              placement="affiliate"
            />
          </div>
          <p className="mt-4 text-2xs text-ink-faint">{attribution}</p>
          <div className="mt-4">
            <AffiliateDisclosure />
          </div>
        </aside>
      </div>

      <div className="mt-10">
        <Link href="/tours/" className="text-sm font-semibold text-navy underline-offset-4 hover:text-clay hover:underline">
          ← All Nashville tours
        </Link>
      </div>
    </div>
  );
}
