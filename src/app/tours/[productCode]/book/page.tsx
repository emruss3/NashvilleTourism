import Link from 'next/link';
import { Breadcrumbs } from '@/components/Ui';
import { AffiliateDisclosure } from '@/components/Trust';
import ViatorLiveAvailability from '@/components/tours/ViatorLiveAvailability';
import { getTourProduct } from '@/lib/feeds/tours';
import { buildMetadata, canonical } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { productCode: string } }) {
  const code = decodeURIComponent(params.productCode);
  const { product } = await getTourProduct(code);
  return buildMetadata({
    title: product ? `Check dates & pricing: ${product.title}` : 'Tour availability',
    description: product
      ? `Check live Viator dates, operating schedules, and pricing for ${product.title}, then continue to Viator for checkout.`
      : 'Check live Viator tour availability and pricing.',
    path: `/tours/${encodeURIComponent(code)}/book/`,
    noindex: true,
  });
}

export default async function ViatorBookPage({ params }: { params: { productCode: string } }) {
  const code = decodeURIComponent(params.productCode);
  const { product, live, error } = await getTourProduct(code);

  if (!live || !product) {
    return (
      <div className="shell pb-16">
        <Breadcrumbs
          trail={[
            { name: 'Tours', href: '/tours/' },
            { name: 'Availability unavailable', href: canonical(`/tours/${encodeURIComponent(code)}/book/`) },
          ]}
        />
        <div className="py-12">
          <p className="eyebrow mb-2">Viator availability</p>
          <h1 className="font-display text-3xl font-bold text-navy">Experience unavailable</h1>
          <p className="mt-3 max-w-prose text-ink-soft">
            {error || 'This experience could not be loaded from Viator right now.'}
          </p>
          <Link href="/tours/" className="btn-primary mt-6 inline-flex min-h-[44px]">
            Back to tours
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="shell pb-16">
      <Breadcrumbs
        trail={[
          { name: 'Tours', href: '/tours/' },
          { name: product.title, href: `/tours/${encodeURIComponent(product.productCode)}/` },
          { name: 'Dates & pricing', href: `/tours/${encodeURIComponent(product.productCode)}/book/` },
        ]}
      />

      <div className="py-6">
        <p className="eyebrow mb-2">Live Viator schedule</p>
        <h1 className="max-w-4xl font-display text-3xl font-bold leading-tight text-navy md:text-4xl">
          {product.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-soft">
          {product.rating != null ? (
            <p>
              <span className="font-semibold text-navy">{product.rating.toFixed(1)}</span>
              {product.reviewCount != null ? ` · ${product.reviewCount.toLocaleString()} reviews` : ' · Viator rating'}
            </p>
          ) : null}
          {product.durationLabel ? <p>{product.durationLabel}</p> : null}
          {product.freeCancellation ? <p className="font-semibold text-navy">Free cancellation</p> : null}
          {product.fromPrice ? <p className="font-semibold text-navy">From {product.fromPrice.formatted}</p> : null}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={`/tours/${encodeURIComponent(product.productCode)}/`}
            className="text-sm font-semibold text-clay underline underline-offset-4"
          >
            View full experience details
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(22rem,1.15fr)] lg:items-start">
        <div>
          {product.imageUrl ? (
            <div className="overflow-hidden rounded-card border border-paper-edge bg-sky/40">
              <img
                src={product.imageUrl}
                alt=""
                className="aspect-[3/2] h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : null}
          {product.description ? (
            <p className="mt-5 line-clamp-6 text-[15px] leading-relaxed text-ink-soft">
              {product.description}
            </p>
          ) : null}
          <div className="mt-5">
            <AffiliateDisclosure compact />
          </div>
        </div>

        <ViatorLiveAvailability
          productCode={product.productCode}
          productTitle={product.title}
          productUrl={product.productUrl}
          fallbackPrice={product.fromPrice?.formatted}
          currency={product.fromPrice?.currency || 'USD'}
        />
      </div>

      <section className="mt-10 border-t border-paper-edge pt-8">
        <h2 className="font-sans text-xl font-bold text-navy">How this works</h2>
        <div className="mt-4 grid gap-4 text-sm leading-relaxed text-ink-soft sm:grid-cols-3">
          <div className="rounded-card border border-paper-edge bg-paper-card p-4">
            <p className="font-semibold text-ink">1. Check the schedule</p>
            <p className="mt-1">NashRoam requests current operating dates, options, start times, and available retail pricing from Viator.</p>
          </div>
          <div className="rounded-card border border-paper-edge bg-paper-card p-4">
            <p className="font-semibold text-ink">2. Confirm the selection</p>
            <p className="mt-1">Where Viator Full Access is enabled, NashRoam checks the selected date, time, and traveler mix in real time.</p>
          </div>
          <div className="rounded-card border border-paper-edge bg-paper-card p-4">
            <p className="font-semibold text-ink">3. Complete on Viator</p>
            <p className="mt-1">Viator handles the transaction and all post-booking service. NashRoam does not process payments or store card data.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
