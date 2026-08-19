import Link from 'next/link';
import { Breadcrumbs } from '@/components/Ui';
import { AffiliateDisclosure } from '@/components/Trust';
import BookingLink from '@/components/BookingLink';
import TourPhotoGallery from '@/components/tours/TourPhotoGallery';
import { ANALYTICS_EVENTS } from '@/lib/analytics';
import { getTourProduct } from '@/lib/feeds/tours';
import type {
  ViatorItineraryStop,
  ViatorLogisticsPoint,
  ViatorProductDetail,
} from '@/lib/feeds/viator';
import { admissionLabel, confirmationLabel, viatorParagraphs } from '@/lib/viator-copy';
import { buildMetadata, canonical } from '@/lib/seo';

export const revalidate = 3600;

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

  const facts = factChips(product);
  const overview = product.description ? viatorParagraphs(product.description) : [];
  const gallery = product.images?.length
    ? product.images
    : product.imageUrl
      ? [{ url: product.imageUrl, isCover: true }]
      : [];
  const sections = [
    { id: 'overview', label: 'Overview' },
    product.inclusions?.length || product.exclusions?.length
      ? { id: 'included', label: "What's included" }
      : null,
    product.meetingPoints?.length || product.endPoints?.length || product.pickupLabel
      ? { id: 'meeting', label: 'Meeting and pickup' }
      : null,
    product.itineraryStops?.length || product.itineraryOverview
      ? { id: 'expect', label: 'What to expect' }
      : null,
    product.additionalInfo?.length ? { id: 'additional', label: 'Additional info' } : null,
    product.cancellationPolicy?.description ? { id: 'cancellation', label: 'Cancellation' } : null,
    { id: 'reviews', label: 'Reviews' },
  ].filter(Boolean) as { id: string; label: string }[];

  return (
    <div className="shell pb-16">
      <Breadcrumbs
        trail={[
          { name: 'Tours', href: '/tours/' },
          { name: product.title, href: `/tours/${encodeURIComponent(product.productCode)}/` },
        ]}
      />

      {gallery.length ? <TourPhotoGallery images={gallery} title={product.title} /> : null}

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
        <div>
          <p className="eyebrow">Viator marketplace</p>
          <h1 className="mt-2 font-display text-3xl font-bold leading-tight text-navy md:text-4xl">
            {product.title}
          </h1>
          {product.supplierName ? (
            <p className="mt-2 text-sm text-ink-faint">By {product.supplierName}</p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-soft">
            {product.rating != null ? (
              <p>
                <span className="font-semibold text-navy">{product.rating.toFixed(1)}</span>
                <span aria-hidden="true" className="ml-1 text-clay">
                  {'★'.repeat(Math.round(product.rating))}
                </span>
                {product.reviewCount != null ? (
                  <>
                    {' '}
                    <a href="#reviews" className="underline-offset-2 hover:text-clay hover:underline">
                      {product.reviewCount.toLocaleString()} reviews
                    </a>
                  </>
                ) : (
                  ' · Viator rating'
                )}
              </p>
            ) : null}
            {product.durationLabel ? <p>{product.durationLabel}</p> : null}
          </div>

          {facts.length ? (
            <ul className="mt-5 flex flex-wrap gap-2">
              {facts.map((fact) => (
                <li
                  key={fact}
                  className="rounded-full border border-paper-edge bg-paper-card px-3 py-1 text-sm text-ink-soft"
                >
                  {fact}
                </li>
              ))}
            </ul>
          ) : null}

          <nav aria-label="On this page" className="mt-8 border-y border-paper-edge py-3">
            <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-medium text-ink-soft">
              {sections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="hover:text-clay">
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <section id="overview" className="scroll-mt-24 py-8">
            <h2 className="font-sans text-xl font-bold text-navy">Overview</h2>
            {overview.length ? (
              <div className="mt-3 max-w-prose space-y-4 text-small leading-relaxed text-ink-soft">
                {overview.map((paragraph) => (
                  <p key={paragraph.slice(0, 48)}>{paragraph}</p>
                ))}
              </div>
            ) : (
              <p className="mt-3 max-w-prose text-small text-ink-soft">
                Full overview copy is available on the Viator booking page.
              </p>
            )}
          </section>

          {(product.inclusions?.length || product.exclusions?.length) && (
            <section id="included" className="scroll-mt-24 border-t border-paper-edge py-8">
              <h2 className="font-sans text-xl font-bold text-navy">What&apos;s included</h2>
              <div className="mt-4 grid gap-8 sm:grid-cols-2">
                {product.inclusions?.length ? (
                  <div>
                    <h3 className="font-sans text-sm font-bold uppercase tracking-wider text-navy">
                      Included
                    </h3>
                    <ul className="mt-3 space-y-2 text-small text-ink-soft">
                      {product.inclusions.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span aria-hidden="true" className="mt-1 text-moss">
                            ✓
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {product.exclusions?.length ? (
                  <div>
                    <h3 className="font-sans text-sm font-bold uppercase tracking-wider text-navy">
                      Not included
                    </h3>
                    <ul className="mt-3 space-y-2 text-small text-ink-soft">
                      {product.exclusions.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span aria-hidden="true" className="mt-1 text-ink-faint">
                            ×
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </section>
          )}

          {(product.meetingPoints?.length || product.endPoints?.length || product.pickupLabel) && (
            <section id="meeting" className="scroll-mt-24 border-t border-paper-edge py-8">
              <h2 className="font-sans text-xl font-bold text-navy">Meeting and pickup</h2>
              {product.pickupLabel ? (
                <p className="mt-3 text-small text-ink-soft">{product.pickupLabel}</p>
              ) : null}
              {product.meetingPoints?.length ? (
                <div className="mt-5">
                  <h3 className="font-sans text-base font-bold text-navy">Meeting point</h3>
                  <LogisticsList points={product.meetingPoints} />
                </div>
              ) : null}
              {product.endPoints?.length ? (
                <div className="mt-5">
                  <h3 className="font-sans text-base font-bold text-navy">End point</h3>
                  <LogisticsList points={product.endPoints} />
                </div>
              ) : null}
            </section>
          )}

          {(product.itineraryStops?.length || product.itineraryOverview) && (
            <section id="expect" className="scroll-mt-24 border-t border-paper-edge py-8">
              <h2 className="font-sans text-xl font-bold text-navy">What to expect</h2>
              {product.itineraryOverview ? (
                <div className="mt-3 max-w-prose space-y-4 text-small leading-relaxed text-ink-soft">
                  {viatorParagraphs(product.itineraryOverview).map((paragraph) => (
                    <p key={paragraph.slice(0, 48)}>{paragraph}</p>
                  ))}
                </div>
              ) : null}
              {product.itineraryStops?.length ? (
                <ol className="mt-6 space-y-5">
                  {product.itineraryStops.map((stop, index) => (
                    <ItineraryStopRow key={`${stop.name ?? 'stop'}-${index}`} stop={stop} index={index} />
                  ))}
                </ol>
              ) : null}
            </section>
          )}

          {product.additionalInfo?.length ? (
            <section id="additional" className="scroll-mt-24 border-t border-paper-edge py-8">
              <h2 className="font-sans text-xl font-bold text-navy">Additional info</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-small text-ink-soft">
                {product.additionalInfo.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {product.cancellationPolicy?.description ? (
            <section id="cancellation" className="scroll-mt-24 border-t border-paper-edge py-8">
              <h2 className="font-sans text-xl font-bold text-navy">Cancellation policy</h2>
              <div className="mt-3 max-w-prose space-y-3 text-small leading-relaxed text-ink-soft">
                {viatorParagraphs(product.cancellationPolicy.description).map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {product.cancellationPolicy.cancelIfBadWeather ? (
                  <p>This activity may be canceled due to bad weather.</p>
                ) : null}
                {product.cancellationPolicy.cancelIfInsufficientTravelers ? (
                  <p>This activity may be canceled if there are not enough travelers.</p>
                ) : null}
              </div>
            </section>
          ) : null}

          {product.productOptions && product.productOptions.length > 1 ? (
            <section className="border-t border-paper-edge py-8">
              <h2 className="font-sans text-xl font-bold text-navy">Available options</h2>
              <ul className="mt-4 space-y-4">
                {product.productOptions.map((option) => (
                  <li key={option.code || option.title} className="rounded-card border border-paper-edge bg-paper-card p-4">
                    <h3 className="font-sans text-base font-bold text-navy">{option.title}</h3>
                    {option.description ? (
                      <p className="mt-1 text-small text-ink-soft">
                        {viatorParagraphs(option.description).join(' ')}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section id="reviews" className="scroll-mt-24 border-t border-paper-edge py-8">
            <h2 className="font-sans text-xl font-bold text-navy">Reviews</h2>
            {product.rating != null ? (
              <p className="mt-3 text-small text-ink-soft">
                <span className="font-semibold text-navy">{product.rating.toFixed(1)} / 5</span>
                {product.reviewCount != null
                  ? ` from ${product.reviewCount.toLocaleString()} Viator traveler reviews.`
                  : ' on Viator.'}{' '}
                Individual review text is shown on the Viator booking page.
              </p>
            ) : (
              <p className="mt-3 text-small text-ink-soft">Reviews for this experience live on Viator.</p>
            )}
            <div className="mt-4">
              <BookingLink
                url={product.productUrl}
                label="Read reviews on Viator"
                name={product.title}
                slug={product.productCode}
                event={ANALYTICS_EVENTS.ACTIVITY_AFFILIATE_CLICKED}
                partner="Viator"
                placement="affiliate"
                variant="secondary"
              />
            </div>
            <p className="mt-6 text-sm text-ink-faint">Product code: {product.productCode}</p>
          </section>
        </div>

        <aside className="h-fit rounded-card border border-paper-edge bg-paper-card p-6 shadow-card lg:sticky lg:top-24">
          {product.fromPrice ? (
            <p className="text-2xl font-bold text-navy">
              From {product.fromPrice.formatted}
              <span className="ml-2 text-sm font-medium text-ink-faint">per person</span>
            </p>
          ) : (
            <p className="text-lg font-semibold text-navy">See live price on Viator</p>
          )}
          <ul className="mt-4 space-y-1.5 text-sm text-ink-soft">
            {product.freeCancellation ? <li>Free cancellation available</li> : null}
            {product.durationLabel ? <li>{product.durationLabel}</li> : null}
            {product.languages?.length ? <li>Offered in {product.languages.join(', ')}</li> : null}
            {product.ticketTypeDescription ? <li>{product.ticketTypeDescription}</li> : null}
            {confirmationLabel(product.confirmationType) ? (
              <li>{confirmationLabel(product.confirmationType)}</li>
            ) : null}
          </ul>
          <p className="mt-4 text-sm text-ink-soft">
            Check dates and complete booking on Viator. This is live provider inventory, separate from
            NashRoam editorial recommendations.
          </p>
          <div className="mt-5">
            <BookingLink
              url={product.productUrl}
              label="Check availability"
              name={product.title}
              slug={product.productCode}
              event={ANALYTICS_EVENTS.ACTIVITY_AFFILIATE_CLICKED}
              partner="Viator"
              placement="affiliate"
            />
          </div>
          <p className="mt-4 text-2xs text-ink-faint">{attribution}</p>
          <div className="mt-4">
            <AffiliateDisclosure compact />
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

function factChips(product: ViatorProductDetail): string[] {
  const chips: string[] = [];
  if (product.durationLabel) chips.push(`${product.durationLabel} (approx.)`);
  if (product.ticketTypeDescription) chips.push(product.ticketTypeDescription);
  if (product.languages?.length) chips.push(`Offered in: ${product.languages.join(', ')}`);
  if (product.freeCancellation) chips.push('Free cancellation');
  if (product.skipTheLine) chips.push('Skip the line');
  if (product.privateTour) chips.push('Private tour');
  if (product.pickupLabel) chips.push(product.pickupLabel);
  if (product.languageGuideLabels?.length) chips.push(...product.languageGuideLabels.slice(0, 2));
  return [...new Set(chips)];
}

function LogisticsList({ points }: { points: ViatorLogisticsPoint[] }) {
  return (
    <ul className="mt-2 space-y-3 text-small text-ink-soft">
      {points.map((point, index) => (
        <li key={`${point.name ?? point.address ?? 'point'}-${index}`}>
          {point.name ? <p className="font-semibold text-navy">{point.name}</p> : null}
          {point.address ? <p>{point.address}</p> : null}
          {point.description
            ? viatorParagraphs(point.description).map((paragraph) => <p key={paragraph}>{paragraph}</p>)
            : null}
        </li>
      ))}
    </ul>
  );
}

function ItineraryStopRow({ stop, index }: { stop: ViatorItineraryStop; index: number }) {
  const title = stop.passByWithoutStopping
    ? `Pass by${stop.name ? `: ${stop.name}` : ''}`
    : stop.name || `Stop ${index + 1}`;
  const admission = admissionLabel(stop.admissionIncluded);

  return (
    <li className="relative pl-8">
      <span
        aria-hidden="true"
        className="absolute left-0 top-1.5 h-3 w-3 rounded-full border-2 border-clay bg-paper-card"
      />
      {stop.dayLabel ? (
        <p className="text-2xs font-bold uppercase tracking-wider text-ink-faint">{stop.dayLabel}</p>
      ) : null}
      <h3 className="font-sans text-base font-bold text-navy">{title}</h3>
      <p className="mt-0.5 text-sm text-ink-faint">
        {[stop.durationLabel, admission].filter(Boolean).join(' · ')}
      </p>
      {stop.description ? (
        <div className="mt-2 max-w-prose space-y-2 text-small text-ink-soft">
          {viatorParagraphs(stop.description).map((paragraph) => (
            <p key={paragraph.slice(0, 40)}>{paragraph}</p>
          ))}
        </div>
      ) : null}
    </li>
  );
}
