import { asset as assetUrl } from '@/lib/seo';
import { site } from '@/lib/site';
import DiscoveryForm from './DiscoveryForm';

/**
 * Homepage opening (MOBILE-FIRST.md §Homepage 2–4), rendered once in mobile
 * reading order: compact introduction, the search module, then one
 * art-directed photograph about 220px tall at 390px wide. Desktop composes
 * the same DOM into two columns: copy and search on the left, the photograph
 * on the right. No masthead splash, no video, one H1.
 *
 * ASSET STATUS: interim photograph is BPH-owned (editorial/rooftop-party), a
 * crowd at a downtown rooftop show. Replace with the commissioned hero when
 * licensed; the crop files follow the same names.
 */
export default function Hero() {
  const mobile = assetUrl('/media/hero/nsvl-hero-rooftop-mobile-800.webp');
  const column = `${assetUrl('/media/hero/nsvl-hero-rooftop-column-800.webp')} 800w, ${assetUrl('/media/hero/nsvl-hero-rooftop-column-1200.webp')} 1200w`;

  return (
    <section className="shell pt-6 md:pt-10 lg:pt-12" aria-labelledby="hero-title">
      <link rel="preload" as="image" media="(max-width: 767px)" href={mobile} fetchPriority="high" />
      <link rel="preload" as="image" media="(min-width: 768px)" imageSrcSet={column} imageSizes="50vw" fetchPriority="high" />
      <div className="grid gap-6 md:grid-cols-2 md:items-center md:gap-10 lg:gap-16">
        <div>
          <p className="eyebrow">{site.heroEyebrow}</p>
          <h1 id="hero-title" className="mt-2 text-[2.5rem] leading-[1.02] sm:text-[3rem] lg:text-hero">
            {site.headline}
          </h1>
          <p className="mt-3 max-w-md text-[17px] text-ink-soft sm:text-lead">{site.headlineSupport}</p>
          <div className="mt-6">
            <DiscoveryForm />
          </div>
        </div>
        <figure className="overflow-hidden rounded-card bg-ink md:order-none">
          <picture>
            <source media="(max-width: 767px)" srcSet={mobile} type="image/webp" />
            <source srcSet={column} sizes="(max-width: 1279px) 50vw, 600px" type="image/webp" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={assetUrl('/media/editorial/rooftop-party.jpg')}
              alt="A crowd facing a rooftop stage at a downtown Nashville show at night."
              width={1200}
              height={900}
              className="aspect-[16/9] h-auto w-full object-cover md:aspect-[4/3]"
              fetchPriority="high"
              decoding="sync"
            />
          </picture>
        </figure>
      </div>
    </section>
  );
}
